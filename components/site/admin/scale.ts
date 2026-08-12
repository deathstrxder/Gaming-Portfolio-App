/**
 * Rounds a value up to the next "nice" axis top — 1, 2 or 5 times a power of ten.
 *
 * A y-axis topped at the series maximum puts the peak flush against the frame and
 * leaves the reader no round number to measure the other points against.
 */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 1) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}
