/**
 * Steps a "nice" axis top for a count series.
 *
 * Picks the tick STEP first and multiplies up, rather than rounding the maximum
 * to the next power of ten. Rounding the maximum wastes most of the plot when a
 * value sits just above a round number — 117 rounds to 200, which squashes the
 * whole series into the bottom half and flattens the shape the chart exists to
 * show. Choosing the step gives 30 x 4 = 120 instead, and round tick labels.
 *
 * Steps are forced to whole numbers because the series is a count of page
 * views; fractional gridlines would label a view that cannot exist.
 */
export function niceAxisTop(max: number, ticks: number): number {
  if (!Number.isFinite(max) || max <= 0) return ticks;

  const rough = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const candidates = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * magnitude);
  const step = Math.max(1, Math.ceil(candidates.find((c) => c >= rough) ?? 10 * magnitude));

  return step * ticks;
}
