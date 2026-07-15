import { count, countDistinct, desc, eq, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { AppDb } from "./index";
import { events } from "./schema";

export interface Breakdown {
  key: string;
  n: number;
}

function groupCount(db: AppDb, type: string, col: AnySQLiteColumn, limit?: number): Breakdown[] {
  const q = db
    .select({ key: col, n: count() })
    .from(events)
    .where(eq(events.type, type))
    .groupBy(col)
    .orderBy(desc(sql`count(*)`));
  const rows = (limit ? q.limit(limit) : q).all();
  return rows.map((r) => ({ key: (r.key as string | null) ?? "Unknown", n: r.n }));
}

export function getTraffic(db: AppDb) {
  const totalVisits =
    db.select({ n: count() }).from(events).where(eq(events.type, "page_view")).get()?.n ?? 0;
  const uniqueVisitors =
    db.select({ n: countDistinct(events.userId) }).from(events).where(eq(events.type, "page_view")).get()?.n ?? 0;
  return {
    totalVisits,
    uniqueVisitors,
    byDevice: groupCount(db, "page_view", events.device),
    byBrowser: groupCount(db, "page_view", events.browser),
    byOs: groupCount(db, "page_view", events.os),
    byRegion: groupCount(db, "page_view", events.region),
    byPath: groupCount(db, "page_view", events.path),
  };
}

export function getAnalytics(db: AppDb) {
  const dodecahedronInteractions =
    db.select({ n: count() }).from(events).where(eq(events.type, "dodecahedron_interaction")).get()?.n ?? 0;
  return {
    mostViewedSections: groupCount(db, "section_view", events.section, 5),
    mostPressedButtons: groupCount(db, "button_click", events.target, 5),
    dodecahedronInteractions,
    topPages: groupCount(db, "page_view", events.path, 5),
  };
}
