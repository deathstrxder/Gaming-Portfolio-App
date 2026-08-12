/**
 * Time ranges for the admin traffic timeline.
 *
 * Pure and dependency-free so the same module runs on the server (building the
 * grouping query) and in the browser (drawing the axis). If the two derived
 * their buckets separately they would eventually disagree, and the chart would
 * label points with times they do not cover.
 *
 * Every range uses FIXED-WIDTH buckets. Fixed widths make the grouping one
 * portable arithmetic expression, make zero-filling exact, and avoid month
 * lengths and daylight-saving shifts entirely.
 */

const HOUR = 3600;
const DAY = 86_400;

export const RANGE_KEYS = ["day", "week", "month", "6months", "year", "all"] as const;

export type RangeKey = (typeof RANGE_KEYS)[number];

export const RANGE_LABELS: Record<RangeKey, string> = {
  day: "Past day",
  week: "Past week",
  month: "Past month",
  "6months": "Past 6 months",
  year: "Past year",
  all: "All time",
};

export function isRangeKey(value: string): value is RangeKey {
  return (RANGE_KEYS as readonly string[]).includes(value);
}

/**
 * Each window is an exact multiple of its bucket, so no bucket is ever partial.
 * A partial leading bucket holds fewer hours of traffic than its neighbours and
 * plots as a dip that is an artefact of the axis rather than the data.
 *
 * "Past year" is 52 whole weeks rather than 365 days for that reason.
 */
const FIXED_RANGES: Record<Exclude<RangeKey, "all">, { windowSec: number; bucketSec: number }> = {
  day: { windowSec: 24 * HOUR, bucketSec: HOUR },
  week: { windowSec: 7 * DAY, bucketSec: DAY },
  month: { windowSec: 30 * DAY, bucketSec: DAY },
  "6months": { windowSec: 182 * DAY, bucketSec: 7 * DAY },
  year: { windowSec: 364 * DAY, bucketSec: 7 * DAY },
};

/** Bucket widths "all time" may choose from, coarsest last. */
const ALL_TIME_LADDER = [HOUR, 6 * HOUR, DAY, 7 * DAY, 30 * DAY];

/** Above this the line stops being readable and the points stop being distinct. */
export const MAX_ALL_TIME_BUCKETS = 60;

export interface TimeWindow {
  /** Inclusive lower bound, unix seconds. */
  startSec: number;
  /** Exclusive upper bound, unix seconds — always "now". */
  endSec: number;
  bucketSec: number;
  bucketCount: number;
}

/**
 * Resolves a range into a concrete window.
 *
 * Windows end at `nowSec` rather than at a calendar boundary: "past day" means
 * the last 24 hours, which is what the phrase means to someone watching their
 * own site.
 *
 * Returns null only for "all" with no events, which has no span to divide.
 */
export function resolveWindow(
  range: RangeKey,
  nowSec: number,
  firstEventSec: number | null,
): TimeWindow | null {
  if (range !== "all") {
    const { windowSec, bucketSec } = FIXED_RANGES[range];
    return {
      startSec: nowSec - windowSec,
      endSec: nowSec,
      bucketSec,
      bucketCount: windowSec / bucketSec,
    };
  }

  if (firstEventSec === null) return null;

  const span = Math.max(0, nowSec - firstEventSec);

  // A site whose only event arrived seconds ago has a near-zero span. Dividing
  // by it would give Infinity buckets, so the floor is one bucket of one hour.
  const bucketSec =
    span <= 0
      ? HOUR
      : (ALL_TIME_LADDER.find((step) => Math.ceil(span / step) <= MAX_ALL_TIME_BUCKETS) ??
        // Longer than the coarsest ladder step can cover: size the bucket to the
        // span so the ceiling holds for any history, however old.
        Math.ceil(span / MAX_ALL_TIME_BUCKETS));

  const bucketCount = Math.max(1, Math.ceil(span / bucketSec));
  return {
    // Anchored to the end so the newest bucket closes exactly at now; this can
    // reach slightly before the first event, which is why the chart covers it
    // rather than cropping it.
    startSec: nowSec - bucketCount * bucketSec,
    endSec: nowSec,
    bucketSec,
    bucketCount,
  };
}

/** The start of each bucket, oldest first. */
export function bucketStarts(w: TimeWindow): number[] {
  return Array.from({ length: w.bucketCount }, (_, i) => w.startSec + i * w.bucketSec);
}

/**
 * Axis label for a bucket, in the reader's own timezone.
 *
 * Buckets under a day show a clock time; a day or more shows a date, because
 * "00:00" repeated across thirty points tells the reader nothing.
 */
export function bucketLabel(startSec: number, bucketSec: number, locale?: string): string {
  const date = new Date(startSec * 1000);
  return bucketSec < DAY
    ? date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/** Full timestamp for the tooltip, where the exact bucket matters. */
export function bucketTooltipLabel(startSec: number, bucketSec: number, locale?: string): string {
  const date = new Date(startSec * 1000);
  return bucketSec < DAY
    ? date.toLocaleString(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}
