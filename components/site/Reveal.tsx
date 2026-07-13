"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Direction = "left" | "right" | "up";

const OFFSET = 120;

/**
 * Reveal: content fades + slides into place as it enters the viewport, and fades +
 * drifts back out as it leaves — in BOTH scroll directions (out the top scrolling
 * down, out the bottom scrolling up), so there's continuous motion either way.
 *
 * The motion is a fixed-duration CSS transition (see `.reveal*` in globals.css),
 * driven by an IntersectionObserver that tracks three phases:
 *   • "visible" while the element sits in the middle band of the viewport,
 *   • "leave"   once it has scrolled up past the band (exits toward `exit`),
 *   • "enter"   before it has arrived / after it drops back below the band.
 *
 * Because the timing is time-based (a fixed ~500ms transition), not scrubbed to
 * scroll position, everything still fades fully in and out even on a fast scroll or
 * a fling after reload — no blinking. The observer fires only on band crossings, so
 * there's no per-frame scroll work, and cards that share a grid row cross together,
 * so they fade in sync.
 *
 * Reduced-motion and no-JS are handled in CSS (globals.css + the layout <noscript>),
 * so content shows immediately and is never stranded invisible.
 */
export function Reveal({
  children,
  from = "left",
  exit = "origin",
  className,
  backdrop,
}: {
  children: ReactNode;
  from?: Direction;
  /** "origin" drifts back out the way it came; "through" exits the opposite edge. */
  exit?: "origin" | "through";
  className?: string;
  /** Tailwind classes for an opaque backdrop that slides with the content but never
   *  fades — so the section streaks can't show through the content while it is
   *  mid-fade. Set it to the content's shape, e.g. "rounded-xl bg-bg". */
  backdrop?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"enter" | "visible" | "leave">("enter");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver support (very old browsers) → just show it. Defer out
    // of the effect body so we don't call setState synchronously during the effect.
    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setPhase("visible"));
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("visible");
        } else {
          // Out of the band: has it scrolled up past the top, or dropped below?
          const bandTop = entry.rootBounds?.top ?? 0;
          setPhase(entry.boundingClientRect.top < bandTop ? "leave" : "enter");
        }
      },
      // Active band = the middle of the viewport; fades in/out ~15% from each edge.
      { rootMargin: "-15% 0px -15% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Per-instance enter/leave offsets (consumed by the CSS transforms).
  const dx = from === "left" ? -OFFSET : from === "right" ? OFFSET : 0;
  const dy = from === "up" ? OFFSET : 0;
  const sign = exit === "through" ? -1 : 1; // "through" leaves the opposite edge
  const style = {
    "--enter": `translate3d(${dx}px, ${dy}px, 0)`,
    "--leave": `translate3d(${dx * sign}px, ${dy * sign}px, 0)`,
  } as CSSProperties;

  const state = phase === "visible" ? " is-visible" : phase === "leave" ? " is-leaving" : "";

  // With a backdrop, the slide and the fade live on separate elements: the outer one
  // slides and carries an opaque backdrop that never fades, while only the inner one
  // fades. A solid surface therefore sits behind the content the whole time, so the
  // background can't bleed through while the content is mid-fade.
  if (backdrop) {
    return (
      <div ref={ref} style={style} className={`reveal-slide relative${state} ${className ?? ""}`}>
        <div className={`pointer-events-none absolute inset-0 ${backdrop}`} aria-hidden />
        <div className={`reveal-fade relative h-full${phase === "visible" ? " is-visible" : ""}`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={style} className={`reveal${state} ${className ?? ""}`}>
      {children}
    </div>
  );
}
