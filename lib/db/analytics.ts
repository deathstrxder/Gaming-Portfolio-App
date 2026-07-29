import { count, countDistinct, desc, eq, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { AppDb } from "./index";
import { events } from "./schema";

export interface Breakdown {
  key: string;
  n: number;
}

async function groupCount(
  db: AppDb,
  type: string,
  col: AnySQLiteColumn,
  limit?: number,
): Promise<Breakdown[]> {
  const q = db
    .select({ key: col, n: count() })
    .from(events)
    .where(eq(events.type, type))
    .groupBy(col)
    .orderBy(desc(sql`count(*)`));
  const rows = await (limit ? q.limit(limit) : q).all();
  return rows.map((r) => ({ key: (r.key as string | null) ?? "Unknown", n: r.n }));
}

export async function getTraffic(db: AppDb) {
  const totalVisits =
    (await db.select({ n: count() }).from(events).where(eq(events.type, "page_view")).get())?.n ?? 0;
  const uniqueVisitors =
    (await db
      .select({ n: countDistinct(events.userId) })
      .from(events)
      .where(eq(events.type, "page_view"))
      .get())?.n ?? 0;
  return {
    totalVisits,
    uniqueVisitors,
    byDevice: await groupCount(db, "page_view", events.device),
    byBrowser: await groupCount(db, "page_view", events.browser),
    byOs: await groupCount(db, "page_view", events.os),
    byRegion: await groupCount(db, "page_view", events.region),
    byPath: await groupCount(db, "page_view", events.path),
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
