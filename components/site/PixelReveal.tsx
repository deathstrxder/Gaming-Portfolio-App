"use client";

import { useIntro } from "@/components/site/IntroContext";

/**
 * Opening reveal for the home backdrop. A curtain of solid, page-coloured blocks
 * covers the GIF during the loading phase, then dissolves away as a pixel mosaic
 * from the bottom of the screen upward once the intro reveals — so the background
 * "resolves" into place instead of sliding in. Bottom rows clear first, and the
 * sides run ahead of the middle so the reveal front curves like a smile; a small
 * deterministic per-cell offset ragged-edges the wave so it reads as scattered
 * pixels, not a clean line.
 *
 * Driven off the intro phase with inline styles (opacity + per-cell transition
 * delay), so a stale stylesheet can't break the reveal. The blocks leave the DOM
 * once the intro is done.
 */

// Typed as `number` (not the literal 28/16) so the single-column/row division-by-zero
// guards below (e.g. `COLS === 1 ? …`) are valid comparisons rather than TS "no overlap" errors.
const COLS: number = 28;
const ROWS: number = 16;
const CURTAIN_COLOR = "#06091a"; // matches the Eddie section background
const SWEEP_MS = 900; // time for the dissolve to travel bottom → top
const CURVE_MS = 300; // "smile": how far the sides run ahead of the middle
const JITTER_MS = 120; // per-cell scatter that ragged-edges the wave
const CELL_MS = 180; // each block's own fade

/** Deterministic 0..1 per cell — scatter without Math.random, so SSR and CSR match. */
function cellJitter(row: number, col: number): number {
  const h = (row * 73856093) ^ (col * 19349663);
  return (Math.abs(h) % 997) / 997;
}

export function PixelReveal() {
  const { phase } = useIntro();
  if (phase === "done") return null; // fully revealed — drop the blocks from the DOM

  const revealing = phase === "revealing";

  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    // bottom rows (higher index) clear first
    const fromBottom = (ROWS - 1 - row) / (ROWS - 1);
    for (let col = 0; col < COLS; col++) {
      // smile: sides (cos → 0) run ahead, the middle (cos → 1) lags behind
      const h = COLS === 1 ? 0.5 : col / (COLS - 1);
      const smile = Math.cos(Math.PI * (h - 0.5));
      const delay = Math.round(
        fromBottom * SWEEP_MS + smile * CURVE_MS + cellJitter(row, col) * JITTER_MS,
      );
      cells.push(
        <div
          key={`${row}-${col}`}
          style={{
            backgroundColor: CURTAIN_COLOR,
            opacity: revealing ? 0 : 1,
            transition: `opacity ${CELL_MS}ms steps(2, end)`,
            transitionDelay: `${delay}ms`,
          }}
        />,
      );
    }
  }

  return (
    <div
      aria-hidden
      className="pixel-curtain pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      }}
    >
      {cells}
    </div>
  );
}
