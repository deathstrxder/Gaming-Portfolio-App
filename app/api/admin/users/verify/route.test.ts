import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb, FakeCookieStore, postJson, signIn } from "@/test/route-harness";
import { users, profiles } from "@/lib/db/schema";
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

async function seedUser(email: string, role: "user" | "admin" = "user"): Promise<number> {
  const [u] = await h.db
    .insert(users)
    .values({ email, passwordHash: "hash", emailVerified: role === "admin" })
    .returning()
    .all();
  await h.db.insert(profiles).values({ userId: u.id, username: `u${u.id}`, role }).run();
  return u.id;
}

beforeEach(async () => {
  h.db = await freshDb();
  h.cookies = new FakeCookieStore();
});

describe("POST /api/admin/users/verify", () => {
  it("refuses an unauthenticated caller", async () => {
    const target = await seedUser("t@example.com");
    const res = await POST(postJson({ userId: target }));
    expect(res.status).toBe(403);
  });

  /**
   * requireAdmin re-reads the role from the database rather than trusting the
   * cookie, so a signed-in non-admin must still be refused.
   */
  it("refuses a signed-in non-admin", async () => {
    const target = await seedUser("t@example.com");
    const plain = await seedUser("plain@example.com");
    await signIn(h.cookies, { userId: plain, role: "admin" }); // lies in the cookie

    const res = await POST(postJson({ userId: target }));
    expect(res.status).toBe(403);

    const row = await h.db.select().from(users).where(eq(users.id, target)).get();
    expect(row!.emailVerified).toBe(false);
  });

  /**
   * The escape hatch for the mail setup this app was given: codes are sent from
   * a gmail.com address through a relay that cannot align DMARC for it, so some
   * will never arrive. Without this the only remedy for a stuck user would be
   * editing the production database by hand.
   */
  it("lets an admin verify a stuck account", async () => {
    const target = await seedUser("stuck@example.com");
    const admin = await seedUser("admin@example.com", "admin");
    await signIn(h.cookies, { userId: admin, role: "admin" });

    const res = await POST(postJson({ userId: target }));
    expect(res.status).toBe(200);

    const row = await h.db.select().from(users).where(eq(users.id, target)).get();
    expect(row!.emailVerified).toBe(true);
  });

  it("rejects a malformed body", async () => {
    const admin = await seedUser("admin@example.com", "admin");
    await signIn(h.cookies, { userId: admin, role: "admin" });

    const res = await POST(postJson({ userId: "not-a-number" }));
    expect(res.status).toBe(400);
  });
});
