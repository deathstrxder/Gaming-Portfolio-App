/**
 * Index arithmetic for the Latest Clips carousel.
 *
 * Kept free of React so the wrap-around rules can be pinned without a DOM, and
 * so a rendering change cannot quietly alter them.
 */

/**
 * Steps the active index by `delta`, wrapping at both ends.
 *
 * The double modulus is deliberate: `-1 % 12` is `-1` in JavaScript, not `11`,
 * so a single `%` would return a negative index when stepping back off the start.
 */
export function stepIndex(current: number, delta: number, total: number): number {
  if (total <= 0) return 0;
  return (((current + delta) % total) + total) % total;
}

/** Clamps a jump target (a dot press) into range. */
export function clampIndex(target: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(target, 0), total - 1);
}
