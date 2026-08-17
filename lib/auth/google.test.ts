import { describe, it, expect, beforeEach } from "vitest";
import { generateState, generateCodeVerifier } from "arctic";
import { getGoogleClient, GOOGLE_SCOPES, googleRedirectUri } from "./google";

beforeEach(() => {
  process.env.APP_BASE_URL = "http://localhost:3000";
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
});

describe("google config", () => {
  it("derives the callback redirect URI from APP_BASE_URL", () => {
    expect(googleRedirectUri()).toBe("http://localhost:3000/api/auth/google/callback");
  });

  it("builds an authorization URL with client_id, redirect_uri, scopes, state, and PKCE", () => {
    const url = getGoogleClient().createAuthorizationURL(
      generateState(),
      generateCodeVerifier(),
      GOOGLE_SCOPES,
    );
    expect(url.hostname).toBe("accounts.google.com");
    const p = url.searchParams;
    expect(p.get("client_id")).toBe("test-client-id");
    expect(p.get("redirect_uri")).toBe("http://localhost:3000/api/auth/google/callback");
    expect(p.get("scope")).toContain("email");
    expect(p.get("state")).toBeTruthy();
    expect(p.get("code_challenge")).toBeTruthy();
    expect(p.get("code_challenge_method")).toBe("S256");
  });

  /**
   * A trailing slash on APP_BASE_URL yields a double slash in the path, and
   * Google compares redirect URIs as exact strings — so
   * "https://site.test//api/auth/google/callback" fails against a registered
   * "https://site.test/api/auth/google/callback" with error 400
   * redirect_uri_mismatch, and nothing in that message hints that one stray
   * character is to blame. A trailing slash is trivially easy to paste into a
   * dashboard field, so the value is normalised rather than trusted.
   */
  it("tolerates a trailing slash on APP_BASE_URL", () => {
    process.env.APP_BASE_URL = "https://site.test/";
    expect(googleRedirectUri()).toBe("https://site.test/api/auth/google/callback");
  });

  it("tolerates repeated trailing slashes and surrounding whitespace", () => {
    process.env.APP_BASE_URL = "  https://site.test//  ";
    expect(googleRedirectUri()).toBe("https://site.test/api/auth/google/callback");
  });

  it("throws a clear error when a required env var is missing", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(() => getGoogleClient()).toThrow(/GOOGLE_CLIENT_ID/);
  });
});
