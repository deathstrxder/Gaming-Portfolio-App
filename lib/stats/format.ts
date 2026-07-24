export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const UNITS: { threshold: number; suffix: string }[] = [
  { threshold: 1e12, suffix: "t" },
  { threshold: 1e9, suffix: "b" },
  { threshold: 1e6, suffix: "m" },
  { threshold: 1e3, suffix: "k" },
];

/** Abbreviates large values for headline display: 4210000000 -> "4.21b". */
export function formatCompactNumber(n: number): string {
  for (const { threshold, suffix } of UNITS) {
    if (n >= threshold) {
      // Three significant figures reads well at every magnitude, and stripping
      // trailing zeroes keeps round numbers clean ("4b", not "4.00b").
      const scaled = (n / threshold).toPrecision(3);
      return `${Number(scaled)}${suffix}`;
    }
  }
  return String(n);
}

/** Exact counts where the precision is the point: 1847 -> "1,847". */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";

  const elapsed = now.getTime() - then;
  if (elapsed < 60_000) return "just now";

  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export function isStale(iso: string, now: Date = new Date()): boolean {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return true;
  return now.getTime() - then > STALE_AFTER_MS;
}
