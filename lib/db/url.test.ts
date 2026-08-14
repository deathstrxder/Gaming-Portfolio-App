import { describe, it, expect } from "vitest";
import { resolveDbUrl } from "./url";

describe("resolveDbUrl", () => {
  it("uses the Turso URL when one is set", () => {
    expect(resolveDbUrl({ TURSO_DATABASE_URL: "libsql://db.turso.io" })).toBe("libsql://db.turso.io");
  });

  it("falls back to the local file when the Turso URL is absent", () => {
    expect(resolveDbUrl({})).toBe("file:data/app.db");
  });

  it("honours DATABASE_PATH for the local fallback", () => {
    expect(resolveDbUrl({ DATABASE_PATH: "data/e2e/app.db" })).toBe("file:data/e2e/app.db");
  });

  /**
   * The reason this helper exists. Playwright's `webServer.env` merges with the
   * parent environment and cannot unset an inherited variable, so an empty
   * string is the only lever the E2E harness has for "use the local file".
   * A plain `??` treats "" as set and hands a blank URL to createClient, which
   * throws at import time instead of falling back.
   */
  it("treats an empty Turso URL as unset", () => {
    expect(resolveDbUrl({ TURSO_DATABASE_URL: "", DATABASE_PATH: "data/e2e/app.db" })).toBe(
      "file:data/e2e/app.db",
    );
  });

  it("treats a whitespace-only Turso URL as unset", () => {
    expect(resolveDbUrl({ TURSO_DATABASE_URL: "   " })).toBe("file:data/app.db");
  });

  it("trims surrounding whitespace from a real Turso URL", () => {
    expect(resolveDbUrl({ TURSO_DATABASE_URL: "  libsql://db.turso.io  " })).toBe(
      "libsql://db.turso.io",
    );
  });
});
