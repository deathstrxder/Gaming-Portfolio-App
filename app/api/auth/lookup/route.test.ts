import { describe, it, expect, beforeEach, vi } from "vitest";
import { freshDb, FakeCookieStore, postJson } from "@/test/route-harness";
import { users } from "@/lib/db/schema";
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

function lookup(email: string, ip = "5.5.5.5") {
  return POST(postJson({ email }, { "x-real-ip": ip }));
}

beforeEach(async () => {
  h.db = await freshDb();
  h.cookies = new FakeCookieStore();
  resetMemory();
});

describe("POST /api/auth/lookup", () => {
  it("reports an unknown address as not registered", async () => {
    const res = await lookup("nobody@example.com");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ exists: false, hasPassword: false });
  });

  it("reports a password account as registered and password-capable", async () => {
    await h.db.insert(users).values({ email: "a@example.com", passwordHash: "hash" }).run();

    const res = await lookup("a@example.com");
    await expect(res.json()).resolves.toEqual({ exists: true, hasPassword: true });
  });

  /**
   * A Google-created or Google-claimed account has no hash, and no password the
   * user could possibly type would be accepted. The panel uses this to offer the
   * Google button instead of a password field that is guaranteed to fail.
   */
  it("reports a Google-only account as registered but without a password", async () => {
    await h.db
      .insert(users)
      .values({ email: "g@example.com", googleId: "g-1", emailVerified: true })
      .run();

    const res = await lookup("g@example.com");
    await expect(res.json()).resolves.toEqual({ exists: true, hasPassword: false });
  });

  it("matches regardless of the case the address was typed in", async () => {
    await h.db.insert(users).values({ email: "a@example.com", passwordHash: "hash" }).run();

    const res = await lookup("A@ExAmPle.CoM");
    await expect(res.json()).resolves.toMatchObject({ exists: true });
  });

  it("rejects a malformed address", async () => {
    const res = await POST(postJson({ email: "not-an-email" }, { "x-real-ip": "5.5.5.5" }));
    expect(res.status).toBe(400);
  });

  /**
   * This endpoint answers "is this address registered?", which is an
   * enumeration oracle by construction — the unified panel cannot branch
   * without it. The limit is what keeps it from being a BULK one: a caller can
   * confirm a few guesses, not harvest a list.
   */
  it("throttles bulk probing by address", async () => {
    for (let i = 0; i < LIMITS.lookupIp.limit; i++) await lookup(`probe${i}@example.com`);

    const res = await lookup("one-too-many@example.com");
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("never returns anything about the account beyond those two flags", async () => {
    await h.db
      .insert(users)
      .values({ email: "a@example.com", passwordHash: "secret-hash", googleId: "g-9" })
      .run();

    const body = await (await lookup("a@example.com")).json();
    expect(Object.keys(body).sort()).toEqual(["exists", "hasPassword"]);
    expect(JSON.stringify(body)).not.toContain("secret-hash");
    expect(JSON.stringify(body)).not.toContain("g-9");
  });
});
