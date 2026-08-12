"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { bucketLabel, bucketTooltipLabel } from "@/lib/analytics/ranges";
import { niceCeil } from "./scale";

export interface TimelinePoint {
  startSec: number;
  n: number;
}

// Fixed user-space geometry. The svg scales to its container uniformly, and the
// marks carry vector-effect="non-scaling-stroke", so a 2px line stays 2px at any
// width instead of thickening with the viewBox.
const W = 960;
const H = 320;
const PAD = { top: 16, right: 16, bottom: 30, left: 52 };
const PLOT = {
  left: PAD.left,
  right: W - PAD.right,
  top: PAD.top,
  bottom: H - PAD.bottom,
};
const PLOT_W = PLOT.right - PLOT.left;
const PLOT_H = PLOT.bottom - PLOT.top;

/** Four intervals reads as a scale without becoming a grid of noise. */
const Y_TICKS = 4;
/** Enough x labels to orient the reader, few enough that they never collide. */
const MAX_X_LABELS = 7;

const xFor = (i: number, count: number) =>
  count <= 1 ? PLOT.left + PLOT_W / 2 : PLOT.left + (i / (count - 1)) * PLOT_W;

const yFor = (n: number, max: number) => PLOT.bottom - (n / max) * PLOT_H;

/**
 * Page views over time: a filled area under a 2px line.
 *
 * One series, so there is no legend — the surrounding heading names it. The
 * hover layer is part of the deliverable rather than an upgrade: a crosshair
 * snaps to the nearest bucket so the reader aims at a time instead of at a
 * 2px line, arrow keys give the same readout without a pointer, and a visually
 * hidden table carries every value for readers who have neither.
 */
export function TrafficChart({
  points,
  bucketSec,
}: {
  points: TimelinePoint[];
  bucketSec: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = useMemo(() => niceCeil(Math.max(...points.map((p) => p.n), 0)), [points]);
  const total = useMemo(() => points.reduce((sum, p) => sum + p.n, 0), [points]);
  const isEmpty = points.length === 0 || total === 0;

  const geometry = useMemo(() => {
    if (points.length === 0) return { line: "", area: "" };
    const coords = points.map((p, i) => [xFor(i, points.length), yFor(p.n, max)] as const);
    const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
    const first = coords[0][0].toFixed(2);
    const last = coords[coords.length - 1][0].toFixed(2);
    return { line, area: `${line} L${last} ${PLOT.bottom} L${first} ${PLOT.bottom} Z` };
  }, [points, max]);

  const labelEvery = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));

  const nearestIndex = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg || points.length === 0) return null;
      const rect = svg.getBoundingClientRect();
      // The svg scales uniformly, so one ratio converts client px to user space.
      const userX = ((clientX - rect.left) / rect.width) * W;
      const ratio = (userX - PLOT.left) / PLOT_W;
      const i = Math.round(ratio * (points.length - 1));
      return Math.min(points.length - 1, Math.max(0, i));
    },
    [points.length],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => setActive(nearestIndex(event.clientX)),
    [nearestIndex],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (points.length === 0) return;
      const delta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (delta === 0) return;
      event.preventDefault();
      setActive((current) => {
        const next = (current ?? 0) + delta;
        return Math.min(points.length - 1, Math.max(0, next));
      });
    },
    [points.length],
  );

  const activePoint = active === null ? null : points[active];

  return (
    <div className="relative">
      <div
        tabIndex={0}
        role="img"
        aria-label={`Page views over time, ${points.length} buckets, ${total} views in total`}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        className="rounded-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-blue"
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-neon-blue)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-neon-blue)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Recessive hairline grid — solid, never dashed. */}
          {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
            const value = (max / Y_TICKS) * (Y_TICKS - i);
            const y = PLOT.top + (i / Y_TICKS) * PLOT_H;
            return (
              <g key={value}>
                <line
                  x1={PLOT.left}
                  x2={PLOT.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  className="text-white/10"
                />
                <text
                  x={PLOT.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted font-body text-[13px]"
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {!isEmpty && (
            <>
              <path d={geometry.area} data-testid="traffic-area" fill="url(#traffic-fill)" />
              <path
                d={geometry.line}
                data-testid="traffic-line"
                fill="none"
                stroke="var(--color-neon-blue)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text
                key={p.startSec}
                x={xFor(i, points.length)}
                y={H - 10}
                textAnchor="middle"
                className="fill-muted font-body text-[13px]"
              >
                {bucketLabel(p.startSec, bucketSec)}
              </text>
            ) : null,
          )}

          {activePoint && (
            <g data-testid="traffic-crosshair" pointerEvents="none">
              <line
                x1={xFor(active!, points.length)}
                x2={xFor(active!, points.length)}
                y1={PLOT.top}
                y2={PLOT.bottom}
                stroke="var(--color-neon-blue)"
                strokeWidth="1"
                strokeOpacity="0.5"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={xFor(active!, points.length)}
                cy={yFor(activePoint.n, max)}
                r="5"
                fill="var(--color-neon-blue)"
                stroke="var(--color-bg)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>
      </div>

      {activePoint && (
        <div
          data-testid="traffic-tooltip"
          role="status"
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 border border-neon-blue/30 bg-bg-elev px-3 py-2 text-center"
        >
          {/* Value first: the reader already knows the series and wants the number. */}
          <p className="font-display text-lg text-ink">{activePoint.n}</p>
          <p className="font-body text-xs uppercase tracking-[0.15em] text-muted">
            {bucketTooltipLabel(activePoint.startSec, bucketSec)}
          </p>
        </div>
      )}

      {isEmpty && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-body text-sm text-muted">
          No page views in this range.
        </p>
      )}

      {/* Every plotted value, reachable without a pointer or a tooltip. */}
      <table className="sr-only">
        <caption>Page views over time</caption>
        <tbody>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Page views</th>
          </tr>
          {points.map((p) => (
            <tr key={p.startSec}>
              <td>{bucketTooltipLabel(p.startSec, bucketSec)}</td>
              <td>{p.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
