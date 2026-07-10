"use client";

import { useEffect, useState } from "react";

import { useIntro } from "@/components/site/IntroContext";

// Flavor status lines that advance with the bar — pure "game boot" texture.
const STATUS_STEPS = [
  { at: 0, label: "INITIALIZING…" },
  { at: 30, label: "LOADING ASSETS…" },
  { at: 65, label: "CALIBRATING HUD…" },
  { at: 90, label: "ALMOST READY…" },
  { at: 100, label: "READY" },
] as const;

const DURATION_MS = 2200; // fixed 0 → 100% sweep, identical every reload
const FLY_MS = 1200; // background fly-up duration; the bar waits this long before blinking away

function statusFor(p: number) {
  let label: string = STATUS_STEPS[0].label;
  for (const s of STATUS_STEPS) if (p >= s.at) label = s.label;
  return label;
}

/**
 * The loading bar, sitting just beneath the Eddie title. It runs a fixed sweep; when
 * it fills, the reveal starts (phase → revealing) and the bar stays full on top
 * while the background flies up. Only once the background has fully flown in does the
 * bar blink twice and blink away.
 */
export function IntroBar() {
  const { phase, setPhase } = useIntro();
  const [progress, setProgress] = useState(0);
  const [blinking, setBlinking] = useState(false);

  // Fixed-duration sweep (runs only during the loading phase). When it fills, the
  // reveal starts immediately and the bar stays full on top while the background
  // flies in.
  useEffect(() => {
    if (phase !== "loading") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 500 : DURATION_MS;
    const ease = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t)); // easeInOutSine
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      if (t >= 1) {
        setProgress(100);
        setPhase("revealing");
        return;
      }
      setProgress(ease(t) * 100);
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, setPhase]);

  // Blink the bar away only once the background has fully flown in.
  useEffect(() => {
    if (phase !== "revealing") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setBlinking(true), reduced ? 0 : FLY_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  const pct = Math.round(progress);

  // Absolute so it hangs below the title without shifting the title's position.
  return (
    <div
      className={`intro-bar pointer-events-none absolute left-0 top-full mt-10 w-full ${
        blinking ? "bar-blink" : ""
      }`}
    >
      <div className="box-glow-blue relative h-2.5 w-full overflow-hidden rounded-full bg-bg-elev">
        <div
          className="loading-bar-fill h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-purple"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between font-display text-xs uppercase tracking-[0.22em] sm:text-sm">
        <span className="text-muted">{statusFor(progress)}</span>
        <span className="tabular-nums text-neon-blue text-glow-blue">{pct}%</span>
      </div>
    </div>
  );
}
