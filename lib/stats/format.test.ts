import { describe, it, expect } from "vitest";
import { formatCompactNumber, formatCount, formatRelativeTime, isStale } from "./format";

describe("formatCompactNumber", () => {
  it("formats billions with two decimals", () => {
    expect(formatCompactNumber(4210000000)).toBe("4.21b");
  });
  it("formats millions and thousands", () => {
    expect(formatCompactNumber(12500000)).toBe("12.5m");
    expect(formatCompactNumber(1240)).toBe("1.24k");
  });
  it("leaves values under 1000 alone", () => {
    expect(formatCompactNumber(999)).toBe("999");
    expect(formatCompactNumber(0)).toBe("0");
  });
  it("trims trailing zeroes", () => {
    expect(formatCompactNumber(4000000000)).toBe("4b");
    expect(formatCompactNumber(1500)).toBe("1.5k");
  });
});

describe("formatCount", () => {
  it("groups thousands with separators rather than abbreviating", () => {
    expect(formatCount(1847)).toBe("1,847");
    expect(formatCount(612)).toBe("612");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-24T18:00:00.000Z");
  it("reports seconds as just now", () => {
    expect(formatRelativeTime("2026-07-24T17:59:30.000Z", now)).toBe("just now");
  });
  it("reports minutes and hours", () => {
    expect(formatRelativeTime("2026-07-24T17:45:00.000Z", now)).toBe("15m ago");
    expect(formatRelativeTime("2026-07-24T16:00:00.000Z", now)).toBe("2h ago");
  });
  it("reports days past 24 hours", () => {
    expect(formatRelativeTime("2026-07-22T18:00:00.000Z", now)).toBe("2d ago");
  });
  it("never reports a future timestamp as negative", () => {
    expect(formatRelativeTime("2026-07-24T19:00:00.000Z", now)).toBe("just now");
  });
});

describe("isStale", () => {
  const now = new Date("2026-07-24T18:00:00.000Z");
  it("is false just inside 24 hours", () => {
    expect(isStale("2026-07-23T18:00:01.000Z", now)).toBe(false);
  });
  it("is true just outside 24 hours", () => {
    expect(isStale("2026-07-23T17:59:59.000Z", now)).toBe(true);
  });
  it("treats an unparseable timestamp as stale", () => {
    expect(isStale("not-a-date", now)).toBe(true);
  });
});
