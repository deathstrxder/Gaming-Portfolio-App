import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeCookieStore } from "@/test/route-harness";

const h = vi.hoisted(() => ({
  cookies: null as unknown as InstanceType<typeof FakeCookieStore>,
}));

vi.mock("next/headers", () => ({
  cookies: async () => h.cookies,
}));

import { GET } from "./route";

beforeEach(() => {
  h.cookies = new FakeCookieStore();
  process.env.APP_BASE_URL = "https://site.test";
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/auth/google", () => {
  it("redirects to Google and stores the PKCE state", async () => {
    const res = await GET();

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("accounts.google.com");
    expect(h.cookies.has("google_oauth_state")).toBe(true);
    expect(h.cookies.has("google_oauth_code_verifier")).toBe(true);
  });

  /**
   * A previous revision carried a signup/login "intent" cookie so the callback
   * could say "you already had an account" to someone who pressed Google on the
   * signup step. The unified panel removed the distinction it depended on, and
   * the cookie went with it. Pinned so it does not creep back: there is exactly
   * one way through this route now.
   */
  it("stores no intent cookie", async () => {
    await GET();
    expect(h.cookies.has("google_oauth_intent")).toBe(false);
  });

  it("logs the redirect_uri it sent, for diagnosing a mismatch", async () => {
    const log = vi.mocked(console.log);
    await GET();

    expect(log.mock.calls.flat().join(" ")).toContain("/api/auth/google/callback");
  });
});
