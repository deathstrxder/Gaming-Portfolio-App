import { describe, it, expect } from "vitest";
import { parseUA } from "./ua";

describe("parseUA", () => {
  it("parses Chrome on Windows desktop", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
    expect(parseUA(ua)).toEqual({ device: "Desktop", browser: "Chrome", os: "Windows" });
  });
  it("parses Safari on iPhone", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(parseUA(ua)).toEqual({ device: "Mobile", browser: "Safari", os: "iOS" });
  });
  it("parses Firefox on Linux and Edge", () => {
    expect(parseUA("Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0")).toEqual({ device: "Desktop", browser: "Firefox", os: "Linux" });
    expect(parseUA("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0").browser).toBe("Edge");
  });
  it("handles null / empty", () => {
    expect(parseUA(null)).toEqual({ device: "Desktop", browser: "Other", os: "Other" });
  });
});
