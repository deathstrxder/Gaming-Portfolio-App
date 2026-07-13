"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient "hacker" code streaks: a fixed, full-viewport layer sitting behind all
 * content (alongside the neon wash + HUD grid). Each streak is a short trail of
 * monospace glyphs that travels along a fixed diagonal like an airplane contrail —
 * new characters appear at the leading edge while the oldest are removed one at a
 * time from the back. Every streak shares one angle (so they stay parallel), sits
 * in its own vertical lane, and spawns at a spread-out horizontal position, so the
 * trails scatter across the whole page instead of bunching on one side. No caret.
 * Subtle by design — low opacity — so it reads as texture, not content.
 *
 * Client-only and mount-gated: renders null on the server and on the first client
 * render, so all the randomness (positions, strings, timing) stays out of the
 * server markup and never causes a hydration mismatch. Honors prefers-reduced-
 * motion by rendering nothing at all.
 */

const STREAK_COUNT = 8;

/** The single diagonal every streak uses — identical for all, so they stay parallel. */
const BASE_ANGLE = -22;

/** Abstract terminal glyphs — evocative of "hacking" but never legible enough to distract. */
const GLYPHS = [
  "0xF3A9",
  "sys.exec()",
  "::run --root",
  "0b10110_01",
  "void(0)",
  "#!/bin/sh",
  "grep -r ./*",
  "0xDEADBEEF",
  "ping -t ::1",
  "chmod 0777",
  "await sync()",
  "SELECT * FROM",
  "traceroute",
  "ssh root@",
  "0x1F::0x9C",
  "cat /proc/*",
  "npm run dev",
  "0b0110_1010",
];

type Color = { text: string; glow: string };

const COLORS: Color[] = [
  { text: "#22d3ee", glow: "rgba(34, 211, 238, 0.7)" }, // neon blue
  { text: "#b026ff", glow: "rgba(176, 0, 255, 0.7)" }, // neon purple
];

/** A streak's fixed spot on screen. Angle is not stored — every streak shares
 *  BASE_ANGLE, keeping them parallel. */
type Slot = { top: number; left: number };

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Join random glyph tokens until the line reaches the target length, giving the
 *  trail a long path to travel along. */
function makeLine(targetLen: number): string {
  let line = pick(GLYPHS);
  while (line.length < targetLen) {
    line += " " + pick(GLYPHS);
  }
  return line;
}

/** A fixed spot for one streak. Each streak owns a vertical lane (so the parallel
 *  lines keep a gap) and spawns somewhere across the page width (so the trails don't
 *  all bunch against the left edge). */
function makeSlot(lane: number, laneCount: number): Slot {
  const TOP_MIN = 6;
  const TOP_MAX = 92;
  const band = (TOP_MAX - TOP_MIN) / laneCount;
  const center = TOP_MIN + (lane + 0.5) * band;
  return {
    // small jitter inside the lane still leaves a gap to the neighbouring lanes
    top: center + rand(-band * 0.18, band * 0.18),
    // spread the spawn (and therefore the whole trail) across the full width
    left: rand(-12, 70),
  };
}

/** One streak: a fixed-length trail that travels along its diagonal — a character
 *  appears at the front each step and one is dropped from the back — then it clears
 *  and sets off again with a new line. */
function Streak({ lane, laneCount }: { lane: number; laneCount: number }) {
  const [slot] = useState(() => makeSlot(lane, laneCount));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const run = () => {
      if (cancelled) return;
      const text = makeLine(Math.round(rand(70, 120)));
      const trailLen = Math.round(rand(24, 40)); // how many glyphs the trail shows at once
      const step = rand(24, 48); // ms per character, both ends move at this rate
      const gap = rand(700, 1800);
      const color = pick(COLORS);
      // Colour changes once per cycle — write it straight to the node.
      el.style.color = color.text;
      el.style.textShadow = `0 0 10px ${color.glow}`;

      const len = text.length;
      let head = 0; // leading edge (exclusive)

      const tick = () => {
        if (cancelled) return;
        head += 1;
        const start = Math.max(0, head - trailLen);
        const stop = Math.min(head, len);
        // Write the DOM imperatively (no React re-render): each streak ticks every
        // ~30ms, so re-rendering 8 of them through React would flood the main thread
        // and stutter scrolling. translateX (before the rotate) walks the trail down
        // the diagonal; ch = one glyph advance, so it stays aligned to the text.
        el.textContent = text.slice(start, stop);
        el.style.transform = `rotate(${BASE_ANGLE}deg) translateX(${start}ch)`;
        if (head < len + trailLen) {
          timer = setTimeout(tick, step);
        } else {
          el.textContent = "";
          timer = setTimeout(run, gap);
        }
      };

      tick();
    };

    // Random initial stagger so the streaks never travel in unison.
    timer = setTimeout(run, rand(0, 2500));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <span
      ref={ref}
      className="hacker-streak"
      style={{
        top: `${slot.top}%`,
        left: `${slot.left}%`,
        // Layout-critical props inline so a stale .hacker-streak rule can't break it;
        // text, transform and colour are then driven imperatively in the effect above.
        transform: `rotate(${BASE_ANGLE}deg)`,
        transformOrigin: "0 50%",
        whiteSpace: "pre",
        letterSpacing: "normal",
      }}
    />
  );
}

export function HackerStreaks() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setActive(true);
  }, []);

  if (!active) return null;

  return (
    <div aria-hidden className="hacker-streaks-layer">
      {Array.from({ length: STREAK_COUNT }).map((_, i) => (
        <Streak key={i} lane={i} laneCount={STREAK_COUNT} />
      ))}
    </div>
  );
}
