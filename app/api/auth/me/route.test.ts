import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeCookieStore, signIn } from "@/test/route-harness";

const h = vi.hoisted(() => ({
  cookies: null as unknown as InstanceType<typeof FakeCookieStore>,
}));

vi.mock("next/headers", () => ({
  cookies: async () => h.cookies,
}));

import { GET } from "./route";
import { setPendingSignup } from "@/lib/auth/pending";

beforeEach(() => {
  h.cookies = new FakeCookieStore();
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
});

describe("GET /api/auth/me", () => {
  it("reports no user when there is no session", async () => {
    const body = await (await GET()).json();
    expect(body.user).toBeNull();
    expect(body.googleEnabled).toBe(true);
  });

  it("reports the signed-in user", async () => {
    await signIn(h.cookies, { userId: 7, role: "user", username: "neo" });

    const body = await (await GET()).json();
    expect(body.user).toMatchObject({ userId: 7, username: "neo" });
  });

  /**
   * The panel lives in a section of the home page, so a refresh mid-signup
   * resets its React state and the user lands back at the address field — after
   * a code has already been emailed to them. Nothing on the client survives the
   * reload, but the sealed pending-signup cookie does, so the server is the only
   * place that can say "you were part-way through verifying".
   */
  it("reports a pending signup so the verify step survives a refresh", async () => {
    await setPendingSignup(42);

    const body = await (await GET()).json();
    expect(body.user).toBeNull();
    expect(body.pendingUserId).toBe(42);
  });

  it("reports no pending signup when there is none", async () => {
    const body = await (await GET()).json();
    expect(body.pendingUserId).toBeNull();
  });

  /**
   * Once signed in there is nothing left to verify, and reporting a stale
   * pending id would send a signed-in user back to a code screen.
   */
  it("does not report a pending signup once the user is signed in", async () => {
    await setPendingSignup(42);
    await signIn(h.cookies, { userId: 42, role: "user", username: "neo" });

    const body = await (await GET()).json();
    expect(body.pendingUserId).toBeUndefined();
  });
});
