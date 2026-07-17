import { describe, it, expect } from "vitest";
import { loginSessionOptions, baseSessionOptions } from "./session";

describe("loginSessionOptions", () => {
  it("remember=false yields a session cookie: cookieOptions has an explicit maxAge key set to undefined", () => {
    const cookieOptions = loginSessionOptions(false).cookieOptions!;
    expect("maxAge" in cookieOptions).toBe(true);
    expect(cookieOptions.maxAge).toBeUndefined();
  });

  it("remember=true yields a persistent 30-day cookie", () => {
    expect(loginSessionOptions(true).cookieOptions!.maxAge).toBe(60 * 60 * 24 * 30);
  });
});

describe("baseSessionOptions", () => {
  it("has a 30-day ttl and the expected base cookie attributes", () => {
    expect(baseSessionOptions.ttl).toBe(60 * 60 * 24 * 30);
    expect(baseSessionOptions.cookieOptions!.httpOnly).toBe(true);
    expect(baseSessionOptions.cookieOptions!.sameSite).toBe("lax");
  });
});
