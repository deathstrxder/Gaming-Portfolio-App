import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq, like } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { freshDb, FakeCookieStore, postJson } from "@/test/route-harness";
import { users, profiles, rateLimits } from "@/lib/db/schema";
import { resetMemory } from "@/lib/security/rate-limit";
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

// Spied so the ordering assertion below can prove bcrypt was never reached,
// rather than inferring it from a status code that several paths can produce.
vi.mock("@/lib/db/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/users")>();
  return { ...actual, verifyPassword: vi.fn(actual.verifyPassword) };
});

import { POST } from "./route";
import { verifyPassword } from "@/lib/db/users";

const PASSWORD = "Correct1!";

async function seedUser(email = "real@example.com"): Promise<number> {
  const [u] = await h.db
    .insert(users)
    .values({ email, passwordHash: bcrypt.hashSync(PASSWORD, 10), emailVerified: true })
    .returning()
    .all();
  await h.db.insert(profiles).values({ userId: u.id, username: `u${u.id}` }).run();
  return u.id;
}

function login(identifier: string, password: string, ip = "5.5.5.5") {
  return POST(postJson({ identifier, password }, { "x-real-ip": ip }));
}

beforeEach(async () => {
  h.db = await freshDb();
  h.cookies = new FakeCookieStore();
  resetMemory();
  vi.mocked(verifyPassword).mockClear();
});

describe("POST /api/auth/login", () => {
  it("still signs in with correct credentials", async () => {
    await seedUser();
    const res = await login("real@example.com", PASSWORD);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true });
  });

  it("rejects wrong credentials with 401", async () => {
    await seedUser();
    const res = await login("real@example.com", "Wrong1!x");
    expect(res.status).toBe(401);
  });

  /**
   * The point of the whole exercise.
   *
   * Vercel Hobby includes 4 CPU-hours a month and a bcrypt compare at cost 10
   * costs roughly 100ms of it, so ~144,000 login attempts exhaust the entire
   * monthly compute allowance. A throttle placed AFTER the compare would spend
   * exactly the CPU it exists to protect, and would still return 429 — so the
   * status code alone cannot tell us the fix works. The spy can.
   */
  it("throttles BEFORE reaching bcrypt", async () => {
    await seedUser();
    for (let i = 0; i < 5; i++) await login("real@example.com", "Wrong1!x");

    vi.mocked(verifyPassword).mockClear();
    const res = await login("real@example.com", "Wrong1!x");

    expect(res.status).toBe(429);
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("returns Retry-After on a throttled response", async () => {
    await seedUser();
    for (let i = 0; i < 5; i++) await login("real@example.com", "Wrong1!x");

    const res = await login("real@example.com", "Wrong1!x");
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("throttles by IP across many different identifiers", async () => {
    for (let i = 0; i < 10; i++) await login(`nobody${i}@example.com`, "Wrong1!x");

    const res = await login("nobody-final@example.com", "Wrong1!x");
    expect(res.status).toBe(429);
  });

  /**
   * The account bucket's subject is caller-supplied text. Consuming it before
   * confirming the account exists would let an attacker mint an unbounded
   * number of rate_limits rows — one per invented identifier — against a 5GB
   * store. Only the IP bucket, whose key space is bounded by the address
   * space, may be consumed before any lookup.
   */
  it("creates no account-bucket row for an identifier matching no user", async () => {
    await login("ghost@example.com", "Wrong1!x");

    const accountRows = await h.db
      .select()
      .from(rateLimits)
      .where(like(rateLimits.key, "login-account:%"))
      .all();
    expect(accountRows).toHaveLength(0);

    const ipRows = await h.db
      .select()
      .from(rateLimits)
      .where(like(rateLimits.key, "login-ip:%"))
      .all();
    expect(ipRows).toHaveLength(1);
  });

  it("keeps the account bucket independent per account", async () => {
    await seedUser("a@example.com");
    await seedUser("b@example.com");
    for (let i = 0; i < 5; i++) await login("a@example.com", "Wrong1!x");

    // b is untouched by a's exhausted budget; the shared IP bucket allows 10.
    const res = await login("b@example.com", PASSWORD);
    expect(res.status).toBe(200);
  });

  it("does not lock out an unverified account before reporting it as unverified", async () => {
    const [u] = await h.db
      .insert(users)
      .values({ email: "unv@example.com", passwordHash: bcrypt.hashSync(PASSWORD, 10) })
      .returning()
      .all();
    await h.db.update(users).set({ emailVerified: false }).where(eq(users.id, u.id)).run();

    const res = await login("unv@example.com", PASSWORD);
    expect(res.status).toBe(403);
  });
});
