import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { rateLimits } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db";
import { consume, resetMemory, windowStartFor } from "./rate-limit";

async function freshDb(): Promise<AppDb> {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as AppDb;
}

/** The in-memory layer is process-global, so each test starts from a clean one. */
beforeEach(() => resetMemory());

describe("windowStartFor", () => {
  /**
   * Both limiter layers must derive the boundary the same way. An instance that
   * anchored its window to first-contact could still be mid-window when the
   * shared window had rolled over, and would then reject a request the database
   * would have admitted.
   */
  it("floors to a fixed multiple of the window, not to first contact", () => {
    expect(windowStartFor(1000, 600)).toBe(600);
    expect(windowStartFor(1199, 600)).toBe(600);
    expect(windowStartFor(1200, 600)).toBe(1200);
  });
});

describe("consume", () => {
  it("admits requests below the limit", async () => {
    const db = await freshDb();
    for (let i = 0; i < 3; i++) {
      expect((await consume(db, "b", "s", 3, 600, { now: 1000 })).ok).toBe(true);
    }
  });

  it("rejects once the limit is reached, with a retry inside the window", async () => {
    const db = await freshDb();
    for (let i = 0; i < 3; i++) await consume(db, "b", "s", 3, 600, { now: 1000 });

    const res = await consume(db, "b", "s", 3, 600, { now: 1000 });
    expect(res.ok).toBe(false);
    expect(res.retryAfterSec).toBeGreaterThan(0);
    expect(res.retryAfterSec).toBeLessThanOrEqual(600);
  });

  /**
   * The limiter must not become the write amplifier it exists to prevent.
   * Rejected traffic is billed against reads (500M/month) rather than writes
   * (10M/month), so an over-limit request must NOT advance the stored counter.
   */
  it("does not write once over the limit", async () => {
    const db = await freshDb();
    for (let i = 0; i < 3; i++) await consume(db, "b", "s", 3, 600, { now: 1000 });

    resetMemory(); // force the database path rather than the in-memory short-circuit
    for (let i = 0; i < 20; i++) await consume(db, "b", "s", 3, 600, { now: 1000 });

    const row = await db.select().from(rateLimits).where(eq(rateLimits.key, "b:s")).get();
    expect(row!.count).toBe(3);
  });

  it("resets when the window rolls over", async () => {
    const db = await freshDb();
    for (let i = 0; i < 3; i++) await consume(db, "b", "s", 3, 600, { now: 1000 });
    expect((await consume(db, "b", "s", 3, 600, { now: 1000 })).ok).toBe(false);

    resetMemory();
    expect((await consume(db, "b", "s", 3, 600, { now: 1800 })).ok).toBe(true);
  });

  it("keeps buckets and subjects independent", async () => {
    const db = await freshDb();
    for (let i = 0; i < 3; i++) await consume(db, "b", "s1", 3, 600, { now: 1000 });

    expect((await consume(db, "b", "s2", 3, 600, { now: 1000 })).ok).toBe(true);
    expect((await consume(db, "other", "s1", 3, 600, { now: 1000 })).ok).toBe(true);
  });

  it("honours RATE_LIMIT_DISABLED outside production", async () => {
    const db = await freshDb();
    const env = { RATE_LIMIT_DISABLED: "1", NODE_ENV: "test" };
    for (let i = 0; i < 10; i++) {
      expect((await consume(db, "b", "s", 1, 600, { now: 1000, env })).ok).toBe(true);
    }
  });

  /**
   * Learned from a real outage.
   *
   * Migration 0005 creates rate_limits. The code that queries it merged and
   * deployed before the migration was applied, so every login hit
   * "no such table: rate_limits", the route did not catch it, and sign-in was
   * down site-wide — brought down by the very thing meant to protect it.
   *
   * A rate limiter is a protective layer. Taking the whole site offline to
   * protect it is a worse outcome than being briefly unprotected, so an
   * infrastructure failure here must ALLOW the request and complain loudly
   * rather than reject it.
   */
  it("fails OPEN and logs when the database is unusable", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = {
      all: async () => {
        throw new Error("SQLITE_UNKNOWN: SQLite error: no such table: rate_limits");
      },
    } as unknown as AppDb;

    const res = await consume(broken, "b", "s", 1, 600, { now: 1000 });

    expect(res.ok).toBe(true);
    expect(err).toHaveBeenCalled();
    expect(err.mock.calls.flat().join(" ")).toMatch(/rate limit/i);
    err.mockRestore();
  });

  it("fails open on the write as well as the read", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    let call = 0;
    const flaky = {
      all: async () => {
        call += 1;
        if (call === 1) return []; // read succeeds, no existing row
        throw new Error("connection reset");
      },
    } as unknown as AppDb;

    const res = await consume(flaky, "b", "s", 1, 600, { now: 1000 });

    expect(res.ok).toBe(true);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  /**
   * The escape hatch exists for the E2E suite. If it were honoured in
   * production, setting one environment variable would silently disarm every
   * limit in the deployed app.
   */
  it("IGNORES RATE_LIMIT_DISABLED in production", async () => {
    const db = await freshDb();
    const env = { RATE_LIMIT_DISABLED: "1", NODE_ENV: "production" };

    expect((await consume(db, "b", "s", 1, 600, { now: 1000, env })).ok).toBe(true);
    expect((await consume(db, "b", "s", 1, 600, { now: 1000, env })).ok).toBe(false);
  });
});
