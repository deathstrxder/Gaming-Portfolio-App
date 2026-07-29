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
    const t = await getTraffic(await seededDb());
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
