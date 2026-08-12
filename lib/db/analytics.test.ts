import { describe, it, expect } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";
import { events, users } from "./schema";
import { getTraffic, getAnalytics } from "./analytics";

async function seededDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  // events.userId has a FK to users.id, so the referenced users (ids 1 and 2)
  // must exist before seeding page_view events that carry a userId.
  await db
    .insert(users)
    .values([
      { email: "a@b.com", passwordHash: "x" },
      { email: "b@b.com", passwordHash: "x" },
    ])
    .run();
  const rows = [
    { type: "page_view", path: "/", device: "Desktop", browser: "Chrome", os: "Windows", region: "America/New_York", userId: 1 },
    { type: "page_view", path: "/", device: "Mobile", browser: "Safari", os: "iOS", region: "Europe/London", userId: 2 },
    { type: "page_view", path: "/subscribe/", device: "Desktop", browser: "Chrome", os: "Windows", region: "America/New_York", userId: 1 },
    { type: "section_view", section: "most-played" },
    { type: "section_view", section: "most-played" },
    { type: "section_view", section: "timeline" },
    { type: "button_click", target: "Subscribe" },
    { type: "button_click", target: "Subscribe" },
    { type: "button_click", target: "Log in" },
    { type: "dodecahedron_interaction" },
    { type: "dodecahedron_interaction" },
  ];
  for (const r of rows) await db.insert(events).values(r).run();
  return db;
}

describe("getTraffic", () => {
  it("totals page_views, unique registered visitors, and breakdowns", async () => {
    const t = await getTraffic(await seededDb(), "all");
    expect(t.totalVisits).toBe(3);
    expect(t.uniqueVisitors).toBe(2);
    expect(t.byDevice.find((b) => b.key === "Desktop")!.n).toBe(2);
    expect(t.byBrowser.find((b) => b.key === "Chrome")!.n).toBe(2);
    expect(t.byRegion.find((b) => b.key === "America/New_York")!.n).toBe(2);
  });
});

describe("getAnalytics", () => {
  it("ranks sections/buttons and counts dodecahedron interactions", async () => {
    const a = await getAnalytics(await seededDb());
    expect(a.mostViewedSections[0]).toEqual({ key: "most-played", n: 2 });
    expect(a.mostPressedButtons[0]).toEqual({ key: "Subscribe", n: 2 });
    expect(a.dodecahedronInteractions).toBe(2);
    expect(a.topPages[0]).toEqual({ key: "/", n: 2 });
  });
});

/**
 * A database whose page_view events sit at controlled times, so bucketing can be
 * asserted against known offsets rather than against the wall clock.
 */
const DAY = 86_400;
const NOW = new Date("2026-08-11T12:00:00.000Z");
const ago = (sec: number) => new Date(NOW.getTime() - sec * 1000);

async function timedDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });

  const rows = [
    // Inside the past day.
    { createdAt: ago(30 * 60), device: "Desktop", path: "/" },
    { createdAt: ago(90 * 60), device: "Desktop", path: "/" },
    // Inside the past week, outside the past day.
    { createdAt: ago(3 * DAY), device: "Mobile", path: "/subscribe/" },
    // Inside the past month, outside the past week.
    { createdAt: ago(20 * DAY), device: "Mobile", path: "/subscribe/" },
    // Far outside every fixed range except all-time.
    { createdAt: ago(500 * DAY), device: "Tablet", path: "/old/" },
  ];
  for (const r of rows) {
    await db.insert(events).values({ type: "page_view", ...r }).run();
  }
  return db;
}

describe("event timestamps", () => {
  // Every bucketing expression is arithmetic on the raw column, so whether
  // Drizzle stores seconds or milliseconds is load-bearing. Getting it wrong
  // yields an empty chart rather than an error, so it is pinned here.
  it("stores created_at as unix SECONDS, not milliseconds", async () => {
    const client = createClient({ url: ":memory:" });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.insert(events).values({ type: "page_view", createdAt: NOW }).run();

    const raw = await client.execute("select created_at from events limit 1");
    expect(Number(raw.rows[0].created_at)).toBe(Math.floor(NOW.getTime() / 1000));
  });
});

describe("getTraffic ranges", () => {
  it("counts only the events inside the window", async () => {
    const db = await timedDb();
    expect((await getTraffic(db, "day", NOW)).totalVisits).toBe(2);
    expect((await getTraffic(db, "week", NOW)).totalVisits).toBe(3);
    expect((await getTraffic(db, "month", NOW)).totalVisits).toBe(4);
    expect((await getTraffic(db, "all", NOW)).totalVisits).toBe(5);
  });

  it("scopes the breakdowns to the window, not to all time", async () => {
    const day = await getTraffic(await timedDb(), "day", NOW);
    expect(day.byDevice).toEqual([{ key: "Desktop", n: 2 }]);
    expect(day.byPath).toEqual([{ key: "/", n: 2 }]);
  });

  it("returns one timeline point per bucket, in order", async () => {
    const t = await getTraffic(await timedDb(), "day", NOW);
    expect(t.timeline).toHaveLength(24);
    for (let i = 1; i < t.timeline.length; i += 1) {
      expect(t.timeline[i].startSec).toBeGreaterThan(t.timeline[i - 1].startSec);
    }
  });

  // A grouped count returns no row for an empty bucket. Plotting only the rows
  // that exist would compress quiet periods and draw a straight line between
  // distant points as though traffic had been continuous.
  it("emits empty buckets as zero rather than omitting them", async () => {
    const t = await getTraffic(await timedDb(), "day", NOW);
    expect(t.timeline.filter((p) => p.n === 0).length).toBe(22);
    expect(t.timeline.reduce((sum, p) => sum + p.n, 0)).toBe(2);
  });

  it("puts each event in the bucket covering its timestamp", async () => {
    const t = await getTraffic(await timedDb(), "day", NOW);
    // Hourly buckets ending at NOW: the 30-min-old event is in the last bucket,
    // the 90-min-old event one before it.
    expect(t.timeline[t.timeline.length - 1].n).toBe(1);
    expect(t.timeline[t.timeline.length - 2].n).toBe(1);
  });

  it("returns an empty timeline for all-time with no events", async () => {
    const client = createClient({ url: ":memory:" });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });

    const t = await getTraffic(db, "all", NOW);
    expect(t.timeline).toEqual([]);
    expect(t.totalVisits).toBe(0);
  });
});
