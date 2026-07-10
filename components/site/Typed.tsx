"use client";

import { Fragment, useEffect, useLayoutEffect, useState } from "react";

// Layout effect on the client (reset-to-empty happens before paint, so the full
// text never flashes), plain effect on the server (SSR renders it full).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type TypedSegment = { text: string; className?: string };

/**
 * Types out text character-by-character with a blinking caret. Renders full on the
 * server / without JS / for reduced motion (so there's no empty-text flash and it
 * stays readable), and only animates on the client.
 *
 * Works inside a `bg-clip-text` gradient parent: the per-character spans are just
 * the glyphs the parent's gradient clips to, so the gradient stays continuous.
 * The wrapping element should carry an `aria-label` — these spans are aria-hidden.
 */
export function Typed({
  segments,
  delay = 0,
  charMs = 35,
}: {
  segments: TypedSegment[];
  delay?: number;
  charMs?: number;
}) {
  const chars = segments.flatMap((s) =>
    [...s.text].map((ch) => ({ ch, className: s.className ?? "" })),
  );
  const total = chars.length;
  const [count, setCount] = useState(total); // SSR + hydration: fully typed

  useIsoLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(total);
      return;
    }
    setCount(0); // before paint → the full text is never shown
    let raf = 0;
    let startedAt = 0;
    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = now - startedAt - delay;
      const n = elapsed <= 0 ? 0 : Math.min(total, Math.floor(elapsed / charMs));
      setCount(n);
      if (n < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total, delay, charMs]);

  const done = count >= total;

  return (
    <span aria-hidden="true">
      {chars.map((c, i) => (
        <Fragment key={i}>
          {i === count && !done && <span className="type-cursor">|</span>}
          <span
            className={c.className}
            style={{ visibility: i < count ? "visible" : "hidden" }}
          >
            {c.ch}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
