import { describe, it, expect, beforeEach, vi } from "vitest";
import { freshDb, FakeCookieStore, postJson } from "@/test/route-harness";
import { users } from "@/lib/db/schema";
import { resetMemory } from "@/lib/security/rate-limit";
import type { AppDb } from "@/lib/db";
import type { EmailMessage } from "@/lib/email";

const h = vi.hoisted(() => ({
  db: null as unknown as AppDb,
  cookies: null as unknown as InstanceType<typeof FakeCookieStore>,
  sent: [] as { to: string; subject: string; text: string }[],
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => h.cookies,
}));

vi.mock("@/lib/email", () => ({
  getMailer: () => ({
    async send(message: EmailMessage) {
      h.sent.push(message);
    },
  }),
}));

import { POST } from "./route";
import { setPendingSignup } from "@/lib/auth/pending";

async function seedUnverified(email: string): Promise<number> {
  const [u] = await h.db
    .insert(users)
    .values({ email, passwordHash: "hash" })
    .returning()
    .all();
  return u.id;
}

function resend(body: unknown = {}, ip = "5.5.5.5") {
  return POST(postJson(body, { "x-real-ip": ip }));
}

beforeEach(async () => {
  h.db = await freshDb();
  h.cookies = new FakeCookieStore();
  h.sent = [];
  resetMemory();
});

describe("POST /api/auth/resend-code", () => {
  it("resends for the pending signup named by the cookie", async () => {
    const id = await seedUnverified("a@example.com");
    await setPendingSignup(id);

    const res = await resend();
    expect(res.status).toBe(200);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].to).toBe("a@example.com");
  });

  it("refuses when there is no pending signup", async () => {
    await seedUnverified("a@example.com");

    const res = await resend();
    expect(res.status).toBe(400);
    expect(h.sent).toHaveLength(0);
  });

  /**
   * The finding this endpoint exists to avoid re-introducing.
   *
   * User ids are small sequential integers. If the id came from the request
   * body, a caller could walk 1..N and mail a real code to every registered
   * address — harassing the site's users and draining a 300-per-day allowance
   * in minutes, which disables signup for everyone. The pending cookie is the
   * only accepted source, and a body id must be ignored outright rather than
   * merely deprioritised.
   */
  it("ignores a userId in the body and uses only the cookie", async () => {
    const mine = await seedUnverified("mine@example.com");
    const victim = await seedUnverified("victim@example.com");
    await setPendingSignup(mine);

    const res = await resend({ userId: victim });

    expect(res.status).toBe(200);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].to).toBe("mine@example.com");
  });

  it("enforces the per-user cooldown", async () => {
    const id = await seedUnverified("a@example.com");
    await setPendingSignup(id);

    expect((await resend()).status).toBe(200);

    const res = await resend();
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(h.sent).toHaveLength(1);
  });

  /**
   * The per-user cooldown alone is not enough: it bounds one account per
   * minute, not one address across many accounts. The IP bucket is what stops
   * a caller cycling pending cookies to keep sending.
   */
  it("enforces an address bucket across different pending users", async () => {
    const ids: number[] = [];
    for (let i = 0; i < 6; i++) ids.push(await seedUnverified(`u${i}@example.com`));

    let lastStatus = 0;
    for (const id of ids) {
      await setPendingSignup(id);
      lastStatus = (await resend()).status;
    }

    expect(lastStatus).toBe(429);
    expect(h.sent.length).toBeLessThan(ids.length);
  });

  it("refuses for an account that is already verified", async () => {
    const [u] = await h.db
      .insert(users)
      .values({ email: "v@example.com", passwordHash: "hash", emailVerified: true })
      .returning()
      .all();
    await setPendingSignup(u.id);

    const res = await resend();
    expect(res.status).toBe(400);
    expect(h.sent).toHaveLength(0);
  });
});
