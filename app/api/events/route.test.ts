import { describe, it, expect, beforeEach, vi } from "vitest";
import { freshDb, FakeCookieStore, postJson } from "@/test/route-harness";
import { events, rateLimits } from "@/lib/db/schema";
import { resetMemory } from "@/lib/security/rate-limit";
import { LIMITS } from "@/lib/security/limits";
import type { AppDb } from "@/lib/db";

const h = vi.hoisted(() => ({
  db: null as unknown as AppDb,
  cookies: null as unknown as InstanceType<typeof FakeCookieStore>,
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => h.cookies,
}));

import { POST } from "./route";

const REAL_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function event(headers: Record<string, string> = {}) {
  return POST(
    postJson(
      { type: "page_view", path: "/" },
      { "user-agent": REAL_UA, "x-real-ip": "5.5.5.5", ...headers },
    ),
  );
}

beforeEach(async () => {
  h.db = await freshDb();
  h.cookies = new FakeCookieStore();
  resetMemory();
  process.env.APP_BASE_URL = "https://site.test";
});

describe("POST /api/events", () => {
  it("records an ordinary event", async () => {
    const res = await event();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ recorded: true });
    expect(await h.db.select().from(events).all()).toHaveLength(1);
  });

  it("accepts a matching Origin", async () => {
    const res = await event({ origin: "https://site.test" });
    expect(res.status).toBe(200);
    expect(await h.db.select().from(events).all()).toHaveLength(1);
  });

  it("rejects a foreign Origin", async () => {
    const res = await event({ origin: "https://evil.test" });
    expect(res.status).toBe(403);
    expect(await h.db.select().from(events).all()).toHaveLength(0);
  });

  /**
   * keepalive beacons fired on unload do not reliably send an Origin, so an
   * absent header must not cost a real visitor their last page view.
   */
  it("allows an absent Origin", async () => {
    const res = await event();
    expect(res.status).toBe(200);
    expect(await h.db.select().from(events).all()).toHaveLength(1);
  });

  it("drops crawler traffic without recording it", async () => {
    const res = await event({ "user-agent": BOT_UA });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ recorded: false });
    expect(await h.db.select().from(events).all()).toHaveLength(0);
  });

  /**
   * The check ORDER, asserted rather than assumed.
   *
   * The rate-limit check is the only step here that touches the database, so it
   * must sit behind the two free header checks. Otherwise crawler volume — and
   * during a test run, the suite's own traffic — spends reads and eats
   * rate-limit budget belonging to real visitors sharing that address.
   */
  it("drops a bot BEFORE consuming any rate-limit budget", async () => {
    for (let i = 0; i < 5; i++) await event({ "user-agent": BOT_UA });

    expect(await h.db.select().from(rateLimits).all()).toHaveLength(0);
  });

  it("rejects a foreign Origin before consuming rate-limit budget", async () => {
    for (let i = 0; i < 5; i++) await event({ origin: "https://evil.test" });

    expect(await h.db.select().from(rateLimits).all()).toHaveLength(0);
  });

  it("throttles a flood from one address", async () => {
    for (let i = 0; i < LIMITS.eventsIp.limit; i++) await event();

    const res = await event();
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);

    // The limiter is the bound on write spend, so the insert must not have run.
    expect(await h.db.select().from(events).all()).toHaveLength(LIMITS.eventsIp.limit);
  });

  it("still rejects a malformed body", async () => {
    const res = await POST(
      postJson({ type: "not_a_real_type" }, { "user-agent": REAL_UA, "x-real-ip": "5.5.5.5" }),
    );
    expect(res.status).toBe(400);
  });
});
