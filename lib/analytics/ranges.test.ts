import { describe, expect, it } from "vitest";

import {
  MAX_ALL_TIME_BUCKETS,
  RANGE_KEYS,
  bucketStarts,
  isRangeKey,
  resolveWindow,
} from "@/lib/analytics/ranges";

const HOUR = 3600;
const DAY = 86_400;
const NOW = 1_786_000_000; // fixed, so nothing here depends on the wall clock

describe("isRangeKey", () => {
  it("accepts every documented key", () => {
    for (const key of RANGE_KEYS) expect(isRangeKey(key)).toBe(true);
  });

  // An unknown ?range= must be rejected by the route rather than quietly
  // falling back, which would serve different data than the caller asked for.
  it("rejects anything else", () => {
    expect(isRangeKey("fortnight")).toBe(false);
    expect(isRangeKey("")).toBe(false);
    expect(isRangeKey("DAY")).toBe(false);
  });
});

describe("resolveWindow — fixed ranges", () => {
  const cases = [
    { range: "day", windowSec: 24 * HOUR, bucketSec: HOUR, buckets: 24 },
    { range: "week", windowSec: 7 * DAY, bucketSec: DAY, buckets: 7 },
    { range: "month", windowSec: 30 * DAY, bucketSec: DAY, buckets: 30 },
    { range: "6months", windowSec: 182 * DAY, bucketSec: 7 * DAY, buckets: 26 },
    { range: "year", windowSec: 364 * DAY, bucketSec: 7 * DAY, buckets: 52 },
  ] as const;

  for (const c of cases) {
    it(`${c.range} spans ${c.buckets} buckets of ${c.bucketSec}s`, () => {
      const w = resolveWindow(c.range, NOW, NOW - 10 * 365 * DAY);
      expect(w).not.toBeNull();
      expect(w!.bucketSec).toBe(c.bucketSec);
      expect(w!.bucketCount).toBe(c.buckets);
      expect(w!.endSec).toBe(NOW);
      expect(w!.startSec).toBe(NOW - c.windowSec);
    });
  }

  // Every window is an exact multiple of its bucket, so no bucket is partial.
  // A partial leading bucket would plot artificially low and read as a dip.
  it("divides every window exactly, leaving no partial bucket", () => {
    for (const c of cases) {
      const w = resolveWindow(c.range, NOW, NOW - 10 * 365 * DAY)!;
      expect((w.endSec - w.startSec) % w.bucketSec).toBe(0);
      expect(w.bucketCount * w.bucketSec).toBe(w.endSec - w.startSec);
    }
  });

  it("does not depend on when the first event was", () => {
    const early = resolveWindow("week", NOW, NOW - 10 * 365 * DAY)!;
    const late = resolveWindow("week", NOW, NOW - 60)!;
    expect(late).toEqual(early);
  });
});

describe("resolveWindow — all time", () => {
  it("returns null when there are no events at all", () => {
    expect(resolveWindow("all", NOW, null)).toBeNull();
  });

  it("never exceeds the bucket ceiling, across spans from an hour to a decade", () => {
    const spans = [
      HOUR,
      6 * HOUR,
      DAY,
      3 * DAY,
      9 * DAY,
      40 * DAY,
      200 * DAY,
      400 * DAY,
      3 * 365 * DAY,
      10 * 365 * DAY,
      40 * 365 * DAY,
    ];
    for (const span of spans) {
      const w = resolveWindow("all", NOW, NOW - span)!;
      expect(w.bucketCount).toBeGreaterThan(0);
      expect(w.bucketCount).toBeLessThanOrEqual(MAX_ALL_TIME_BUCKETS);
      expect(w.bucketSec).toBeGreaterThan(0);
    }
  });

  it("covers the first event rather than cropping it", () => {
    const w = resolveWindow("all", NOW, NOW - 9 * DAY)!;
    expect(w.startSec).toBeLessThanOrEqual(NOW - 9 * DAY);
    expect(w.endSec).toBe(NOW);
  });

  // A site whose only event arrived seconds ago has a near-zero span; dividing
  // by it would yield Infinity buckets or NaN.
  it("survives a zero-length span", () => {
    const w = resolveWindow("all", NOW, NOW)!;
    expect(w.bucketCount).toBe(1);
    expect(Number.isFinite(w.bucketSec)).toBe(true);
    expect(w.bucketSec).toBeGreaterThan(0);
  });

  it("picks a finer bucket for a short history than for a long one", () => {
    const short = resolveWindow("all", NOW, NOW - 12 * HOUR)!;
    const long = resolveWindow("all", NOW, NOW - 5 * 365 * DAY)!;
    expect(short.bucketSec).toBeLessThan(long.bucketSec);
  });
});

describe("bucketStarts", () => {
  it("is contiguous, non-overlapping, and ends at the window end", () => {
    const w = resolveWindow("week", NOW, null)!;
    const starts = bucketStarts(w);

    expect(starts).toHaveLength(w.bucketCount);
    expect(starts[0]).toBe(w.startSec);
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i] - starts[i - 1]).toBe(w.bucketSec);
    }
    expect(starts[starts.length - 1] + w.bucketSec).toBe(w.endSec);
  });
});
