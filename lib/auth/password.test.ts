import { describe, it, expect } from "vitest";
import { checkPassword, isPasswordValid } from "./password";

describe("checkPassword", () => {
  it("passes every rule for a strong password", () => {
    expect(checkPassword("Abc1!x")).toEqual({
      minLength: true,
      uppercase: true,
      lowercase: true,
      number: true,
      special: true,
    });
  });

  it("flags a too-short password", () => {
    expect(checkPassword("Ab1!").minLength).toBe(false);
  });

  it("flags a missing uppercase / number / special individually", () => {
    expect(checkPassword("abc123!").uppercase).toBe(false);
    expect(checkPassword("Abcdef!").number).toBe(false);
    expect(checkPassword("Abc1234").special).toBe(false);
  });
});

describe("isPasswordValid", () => {
  it("is true only when all rules pass", () => {
    expect(isPasswordValid("Abc1!x")).toBe(true);
    expect(isPasswordValid("password")).toBe(false);
    expect(isPasswordValid("ALLUPPER1!")).toBe(false);
  });
});
