import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeCookieStore } from "@/test/route-harness";

const h = vi.hoisted(() => ({
  cookies: null as unknown as InstanceType<typeof FakeCookieStore>,
}));

vi.mock("next/headers", () => ({
  cookies: async () => h.cookies,
}));

// The error paths under test return before any of these are reached; mocking
// them keeps the module graph from opening a database connection at import.
vi.mock("@/lib/db", () => ({ db: {} }));

import { GET } from "./route";

function callback(query: string): Request {
  return new Request(`https://site.test/api/auth/google/callback?${query}`);
}

function location(res: Response): string {
  return res.headers.get("Location") ?? "";
}

beforeEach(() => {
  h.cookies = new FakeCookieStore();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/auth/google/callback — failure reporting", () => {
  /**
   * Google reports a refusal by redirecting here with ?error=..., carrying the
   * reason. The route used to fall into its generic "missing code" branch and
   * redirect to ?error=oauth, discarding the one piece of information that says
   * WHY — which turned "access_denied because the consent screen is still in
   * Testing mode" into an unfalsifiable "Google sign-in failed".
   */
  it("passes Google's own error code through instead of flattening it", async () => {
    const res = await GET(callback("error=access_denied&state=abc"));

    expect(res.status).toBe(302);
    expect(location(res)).toContain("error=access_denied");
  });

  it("logs the reason server-side, where the operator can find it", async () => {
    const err = vi.mocked(console.error);
    await GET(callback("error=admin_policy_enforced&state=abc"));

    expect(err).toHaveBeenCalled();
    expect(err.mock.calls.flat().join(" ")).toContain("admin_policy_enforced");
  });

  /**
   * The error value is attacker-supplied — anyone can link to this endpoint with
   * any query string — and it is reflected into a redirect. Only a known-safe
   * shape may be echoed, or this becomes a way to smuggle content into the URL.
   */
  it("refuses to reflect a malformed error value", async () => {
    const res = await GET(callback("error=%3Cscript%3Ealert(1)%3C/script%3E&state=abc"));

    expect(location(res)).not.toContain("script");
    expect(location(res)).toContain("error=oauth");
  });

  it("refuses to reflect an absurdly long error value", async () => {
    const res = await GET(callback(`error=${"a".repeat(500)}&state=abc`));

    expect(location(res)).toContain("error=oauth");
    expect(location(res).length).toBeLessThan(120);
  });

  it("still reports a generic failure when the callback is simply malformed", async () => {
    const res = await GET(callback("state=abc"));

    expect(res.status).toBe(302);
    expect(location(res)).toContain("error=oauth");
  });

  it("clears the one-time OAuth cookies even on the error path", async () => {
    h.cookies.set("google_oauth_state", "abc");
    h.cookies.set("google_oauth_code_verifier", "xyz");

    await GET(callback("error=access_denied&state=abc"));

    expect(h.cookies.has("google_oauth_state")).toBe(false);
    expect(h.cookies.has("google_oauth_code_verifier")).toBe(false);
  });
});
