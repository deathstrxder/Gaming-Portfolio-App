import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { freshDb, FakeCookieStore, postJson, signIn } from "@/test/route-harness";
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

const CURRENT = "Current1!";
const NEXT = "Brandnew1!";

async function seedSignedInUser(): Promise<number> {
  const [u] = await h.db
    .insert(users)
    .values({
      email: "u@example.com",
      passwordHash: bcrypt.hashSync(CURRENT, 10),
      emailVerified: true,
    })
    .returning()
    .all();
  await signIn(h.cookies, { userId: u.id });
  return u.id;
}

beforeEach(async () => {
  h.db = await freshDb();
  h.cookies = new FakeCookieStore();
  resetMemory();
});

describe("POST /api/account/password", () => {
  it("rejects an unauthenticated caller", async () => {
    const res = await POST(postJson({ newPassword: NEXT }));
    expect(res.status).toBe(401);
  });

  it("changes the password with the correct current one", async () => {
    await seedSignedInUser();
    const res = await POST(postJson({ currentPassword: CURRENT, newPassword: NEXT }));
    expect(res.status).toBe(200);
  });

  it("rejects a wrong current password", async () => {
    await seedSignedInUser();
    const res = await POST(postJson({ currentPassword: "Wrong1!x", newPassword: NEXT }));
    expect(res.status).toBe(403);
  });

  /**
   * This endpoint runs a bcrypt compare AND a bcrypt hash per call, so it is
   * the second most expensive path in the app after login. An authenticated
   * caller looping it would spend the same 4 CPU-hour monthly allowance.
   */
  it("throttles repeated attempts", async () => {
    await seedSignedInUser();
    for (let i = 0; i < LIMITS.pwchangeUser.limit; i++) {
      await POST(postJson({ currentPassword: "Wrong1!x", newPassword: NEXT }));
    }

    const res = await POST(postJson({ currentPassword: CURRENT, newPassword: NEXT }));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
