import { and, count, countDistinct, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { SQL } from "drizzle-orm";
import type { AppDb } from "./index";
import { events } from "./schema";
import { bucketStarts, resolveWindow, type RangeKey, type TimeWindow } from "@/lib/analytics/ranges";

export interface Breakdown {
  key: string;
  n: number;
}

/** One point on the traffic timeline. `startSec` is the bucket's inclusive start. */
export interface TimelinePoint {
  startSec: number;
  n: number;
}

async function groupCount(
  db: AppDb,
  type: string,
  col: AnySQLiteColumn,
  limit?: number,
  within?: SQL | undefined,
): Promise<Breakdown[]> {
  const q = db
    .select({ key: col, n: count() })
    .from(events)
    .where(within ? and(eq(events.type, type), within) : eq(events.type, type))
    .groupBy(col)
    .orderBy(desc(sql`count(*)`));
  const rows = await (limit ? q.limit(limit) : q).all();
  return rows.map((r) => ({ key: (r.key as string | null) ?? "Unknown", n: r.n }));
}

/**
 * Counts page views per bucket, zero-filling the buckets no event landed in.
 *
 * The grouping is arithmetic on the raw `created_at` column, which Drizzle
 * stores as unix SECONDS for `mode: "timestamp"` — pinned by a test, because a
 * seconds/milliseconds mix-up here produces an empty chart rather than an error.
 *
 * The bucket index is clamped to the last bucket so an event landing exactly on
 * the window's end lands inside the chart instead of one bucket past it.
 */
async function getTimeline(db: AppDb, w: TimeWindow): Promise<TimelinePoint[]> {
  const bucket = sql<number>`min(cast((${events.createdAt} - ${w.startSec}) / ${w.bucketSec} as integer), ${w.bucketCount - 1})`;

  const rows = await db
    .select({ bucket, n: count() })
    .from(events)
    .where(and(eq(events.type, "page_view"), withinWindow(w)))
    .groupBy(bucket)
    .all();

  const counts = new Map(rows.map((r) => [Number(r.bucket), r.n]));
  return bucketStarts(w).map((startSec, i) => ({ startSec, n: counts.get(i) ?? 0 }));
}

/** Both bounds inclusive — see the clamp in getTimeline for why the end is too. */
function withinWindow(w: TimeWindow): SQL {
  return and(
    gte(events.createdAt, new Date(w.startSec * 1000)),
    lte(events.createdAt, new Date(w.endSec * 1000)),
  )!;
}

/**
 * Traffic for one time range.
 *
 * `now` is injectable so tests can assert bucketing against fixed offsets rather
 * than against the wall clock.
 */
export async function getTraffic(db: AppDb, range: RangeKey, now: Date = new Date()) {
  const nowSec = Math.floor(now.getTime() / 1000);

  // Raw `sql<number>` rather than drizzle's min(), which routes the result back
  // through the column's Date mapper and hands back milliseconds. That silently
  // makes the all-time span negative, collapsing the window to a single hour.
  const firstEventSec =
    (await db
      .select({ t: sql<number | null>`min(${events.createdAt})` })
      .from(events)
      .where(eq(events.type, "page_view"))
      .get())?.t ?? null;

  const window = resolveWindow(range, nowSec, firstEventSec);

  // Only "all" with no events at all has no window, and then there is nothing
  // to count either.
  const within = window ? withinWindow(window) : undefined;
  const scoped = within ? and(eq(events.type, "page_view"), within) : eq(events.type, "page_view");

  const totalVisits = (await db.select({ n: count() }).from(events).where(scoped).get())?.n ?? 0;
  const uniqueVisitors =
    (await db.select({ n: countDistinct(events.userId) }).from(events).where(scoped).get())?.n ?? 0;

  return {
    range,
    totalVisits,
    uniqueVisitors,
    timeline: window ? await getTimeline(db, window) : [],
    bucketSec: window?.bucketSec ?? 0,
    byDevice: await groupCount(db, "page_view", events.device, undefined, within),
    byBrowser: await groupCount(db, "page_view", events.browser, undefined, within),
    byOs: await groupCount(db, "page_view", events.os, undefined, within),
    byRegion: await groupCount(db, "page_view", events.region, undefined, within),
    byPath: await groupCount(db, "page_view", events.path, undefined, within),
  };
}

export async function getAnalytics(db: AppDb) {
  const dodecahedronInteractions =
    (await db
      .select({ n: count() })
      .from(events)
      .where(eq(events.type, "dodecahedron_interaction"))
      .get())?.n ?? 0;
  return {
    mostViewedSections: await groupCount(db, "section_view", events.section, 5),
    mostPressedButtons: await groupCount(db, "button_click", events.target, 5),
    dodecahedronInteractions,
    topPages: await groupCount(db, "page_view", events.path, 5),
  };
}
