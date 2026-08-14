import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb, FakeCookieStore, postJson } from "@/test/route-harness";
import { users } from "@/lib/db/schema";
import { resetMemory } from "@/lib/security/rate-limit";
import { LIMITS } from "@/lib/security/limits";
import type { AppDb } from "@/lib/db";
import type { EmailMessage } from "@/lib/email";

const h = vi.hoisted(() => ({
  db: null as unknown as AppDb,
  cookies: null as unknown as InstanceType<typeof FakeCookieStore>,
  sent: [] as { to: string; subject: string; text: string }[],
  sendFails: false,
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
      if (h.sendFails) throw new Error("brevo unavailable");
      h.sent.push(message);
    },
  }),
}));

import { POST } from "./route";

const PASSWORD = "Str0ng!pass";

function signup(email: string, password = PASSWORD, ip = "5.5.5.5") {
  return POST(postJson({ email, password }, { "x-real-ip": ip }));
}

beforeEach(async () => {
  h.db = await freshDb();
  h.cookies = new FakeCookieStore();
  h.sent = [];
  h.sendFails = false;
  resetMemory();
});

describe("POST /api/auth/signup", () => {
  /**
   * The original defect. The route returned `{ userId, code }` and the panel
   * rendered the code, so anyone could register an address they did not own and
   * verify it immediately.
   */
  it("never returns the verification code in the response", async () => {
    const res = await signup("new@example.com");
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body).toHaveProperty("userId");
    expect(body).not.toHaveProperty("code");
    expect(JSON.stringify(body)).not.toMatch(/\d{6}/);
  });

  it("emails the code to the address that was registered", async () => {
    await signup("new@example.com");

    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].to).toBe("new@example.com");
    expect(h.sent[0].text).toMatch(/\d{6}/);
  });

  it("rejects a weak password before creating anything", async () => {
    const res = await signup("new@example.com", "weak");
    expect(res.status).toBe(400);

    const rows = await h.db.select().from(users).all();
    expect(rows).toHaveLength(0);
  });

  /**
   * Without this the 503 below is a dead end: the account exists, so a retry
   * would hit 409 and the client flow only reaches the verify screen after a
   * successful signup. The user could never finish — and unreliable delivery
   * makes that the expected path, not an edge case.
   */
  it("re-sends instead of refusing when the account exists but is unverified", async () => {
    await signup("again@example.com");
    h.sent = [];

    const res = await signup("again@example.com");
    expect(res.status).toBe(201);
    expect(h.sent).toHaveLength(1);

    const rows = await h.db.select().from(users).all();
    expect(rows).toHaveLength(1);
  });

  /**
   * The resend path must not become a password-reset oracle: anyone can post a
   * known address, so accepting a new password there would let them overwrite
   * the credential on an account they do not control.
   */
  it("does not change the stored password when re-sending", async () => {
    await signup("again@example.com");
    const before = (await h.db.select().from(users).all())[0].passwordHash;

    await signup("again@example.com", "Different1!");

    const after = (await h.db.select().from(users).all())[0].passwordHash;
    expect(after).toBe(before);
  });

  it("still refuses a verified account with 409", async () => {
    await signup("done@example.com");
    await h.db.update(users).set({ emailVerified: true }).where(eq(users.email, "done@example.com")).run();

    const res = await signup("done@example.com");
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ error: "email_taken" });
  });

  it("returns 503 and keeps the account when the mail fails", async () => {
    h.sendFails = true;

    const res = await signup("fail@example.com");
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: "email_send_failed" });

    // Kept deliberately: deleting it would break the retry that recovers the user.
    const rows = await h.db.select().from(users).all();
    expect(rows).toHaveLength(1);
  });

  it("sets a pending-signup cookie so resend can identify the caller", async () => {
    await signup("new@example.com");
    expect(h.cookies.has("eddie_pending")).toBe(true);
  });

  it("throttles signups by address", async () => {
    for (let i = 0; i < LIMITS.signupIp.limit; i++) {
      await signup(`user${i}@example.com`);
    }

    const res = await signup("one-too-many@example.com");
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
