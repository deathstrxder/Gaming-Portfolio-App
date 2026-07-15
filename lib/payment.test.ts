import { describe, it, expect } from "vitest";
import { luhnValid, detectBrand, cardLast4, validateExpiry, validateCvc } from "./payment";

describe("luhnValid", () => {
  it("accepts valid card numbers (with spaces) and rejects bad ones", () => {
    expect(luhnValid("4242 4242 4242 4242")).toBe(true);
    expect(luhnValid("5555555555554444")).toBe(true);
    expect(luhnValid("378282246310005")).toBe(true);
    expect(luhnValid("4242424242424241")).toBe(false);
    expect(luhnValid("1234")).toBe(false);
    expect(luhnValid("")).toBe(false);
  });
});

describe("detectBrand", () => {
  it("detects the major brands", () => {
    expect(detectBrand("4242424242424242")).toBe("Visa");
    expect(detectBrand("5555555555554444")).toBe("Mastercard");
    expect(detectBrand("378282246310005")).toBe("Amex");
    expect(detectBrand("6011111111111117")).toBe("Discover");
    expect(detectBrand("9999999999999999")).toBe("Card");
  });
});

describe("cardLast4", () => {
  it("returns the last four digits", () => {
    expect(cardLast4("4242 4242 4242 4242")).toBe("4242");
  });
});

describe("validateExpiry", () => {
  const now = new Date(2026, 6, 15); // July 15, 2026
  it("accepts a future month and this month, rejects past + bad format", () => {
    expect(validateExpiry("12/26", now)).toBe(true);
    expect(validateExpiry("07/26", now)).toBe(true);
    expect(validateExpiry("06/26", now)).toBe(false);
    expect(validateExpiry("13/26", now)).toBe(false);
    expect(validateExpiry("banana", now)).toBe(false);
  });
});

describe("validateCvc", () => {
  it("requires 3 digits (4 for Amex)", () => {
    expect(validateCvc("123")).toBe(true);
    expect(validateCvc("12")).toBe(false);
    expect(validateCvc("1234", "Amex")).toBe(true);
    expect(validateCvc("123", "Amex")).toBe(false);
  });
});
