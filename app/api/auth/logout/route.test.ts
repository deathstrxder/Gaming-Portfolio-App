import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeCookieStore, signIn } from "@/test/route-harness";

const h = vi.hoisted(() => ({
  cookies: null as unknown as InstanceType<typeof FakeCookieStore>,
}));

vi.mock("next/headers", () => ({
  cookies: async () => h.cookies,
}));

import { POST } from "./route";
import { setPendingSignup, getPendingSignup } from "@/lib/auth/pending";

beforeEach(() => {
  h.cookies = new FakeCookieStore();
});

describe("POST /api/auth/logout", () => {
  /**
   * iron-session clears by OVERWRITING the cookie with an empty, already-expired
   * one rather than deleting it, so asserting the cookie is absent tests the
   * fake store's bookkeeping instead of the behaviour. What matters is that the
   * cookie no longer carries a sealed session.
   */
  it("ends the session", async () => {
    await signIn(h.cookies, { userId: 7, role: "user", username: "neo" });
    expect(h.cookies.get("eddie_session")?.value).toBeTruthy();

    const res = await POST();

    expect(res.status).toBe(200);
    expect(h.cookies.get("eddie_session")?.value ?? "").toBe("");
  });

  /**
   * The pending-signup cookie is httpOnly and lives 15 minutes, so the client
   * cannot clear it and the panel resumes the verify step from it after a
   * reload. Without clearing it here, someone who abandons mid-signup is
   * returned to the code screen on every visit for a quarter of an hour with no
   * way off it — the same dead end the username step had, reintroduced by the
   * resume feature. Signing out is the one action that means "I am done here",
   * so it has to clear both.
   */
  it("also abandons a half-finished signup", async () => {
    await setPendingSignup(42);
    expect(await getPendingSignup()).toBe(42);

    await POST();

    expect(await getPendingSignup()).toBeNull();
  });

  it("is harmless when there is nothing to clear", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true });
  });
});
