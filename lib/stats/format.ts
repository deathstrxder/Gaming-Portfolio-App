/**
 * Display helpers for the clips carousel.
 *
 * `formatCompactNumber`, `isStale` and `STALE_AFTER_MS` also lived here, for the
 * live Hypixel badge's headline figures and its live/cached dot. They went with
 * that badge when the API application was denied — nothing else ever called
 * them, and keeping formatters for a surface that no longer exists just invites
 * someone to wire them back into one that does not need them.
 */

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
