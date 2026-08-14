import { describe, it, expect } from "vitest";
import { clientIp, SHARED_SUBJECT } from "./client-ip";

function req(headers: Record<string, string>): Request {
  return new Request("https://example.test/api/events", { method: "POST", headers });
}

describe("clientIp", () => {
  it("prefers x-real-ip, which the platform sets and a caller cannot forge past it", () => {
    expect(clientIp(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  /**
   * The whole reason this helper exists.
   *
   * `x-forwarded-for` is caller-appendable: anyone can send
   * `x-forwarded-for: 1.2.3.4` and, if we read the FIRST entry, mint a brand new
   * rate-limit subject on every request. That turns every IP-keyed limit in the
   * app into a no-op. The trusted value is the one appended nearest the edge,
   * which is the last entry — or better, x-real-ip.
   */
  it("ignores a spoofed leading x-forwarded-for entry when x-real-ip is present", () => {
    const r = req({ "x-forwarded-for": "1.2.3.4, 9.9.9.9", "x-real-ip": "9.9.9.9" });
    expect(clientIp(r)).toBe("9.9.9.9");
  });

  it("takes the LAST x-forwarded-for entry, never the first", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("handles a single-entry x-forwarded-for", () => {
    expect(clientIp(req({ "x-forwarded-for": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("tolerates whitespace around entries", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4 ,  9.9.9.9  " }))).toBe("9.9.9.9");
  });

  /**
   * Falling back to a single shared subject rather than to "unlimited" is
   * deliberate: an attacker who can strip both headers would otherwise bypass
   * every limit by sending nothing at all.
   */
  it("falls back to one shared subject when no trusted header is present", () => {
    expect(clientIp(req({}))).toBe(SHARED_SUBJECT);
  });

  it("falls back to the shared subject when the headers are blank", () => {
    expect(clientIp(req({ "x-forwarded-for": "  ", "x-real-ip": "" }))).toBe(SHARED_SUBJECT);
  });
});
