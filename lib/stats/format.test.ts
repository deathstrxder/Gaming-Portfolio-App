import { describe, it, expect } from "vitest";
import { formatCount, formatRelativeTime } from "./format";

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

