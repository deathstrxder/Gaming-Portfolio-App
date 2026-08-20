"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * RevealOnce: one-shot entrance trigger for the resume section. Adds `is-in`
 * to the inner `.ronce` div the first time the wrapper enters the viewport,
 * then disconnects the observer — content arrives once and stays (the Apple
 * grammar), and with no live observer there is nothing for the moving boxes
 * to feed back into, which matters because this section is the bottom of the
 * page (see the jitter note in Reveal.tsx and SupportMe.tsx).
 *
 * The observed `.ronce-root` never transforms; the elements that move are the
 * `.ronce-item` descendants the caller marks, each carrying an inline
 * `--stagger-i` that the CSS turns into a 70ms-per-item delay (globals.css).
 *
 * The bottom rootMargin trims 12% so an entrance is visible rather than
 * subliminal, while staying shallow enough that the last panels above the
 * footer still cross it at maximum scroll. Reduced-motion and no-JS visitors
 * see everything immediately (globals.css + the layout <noscript>).
 */
export function RevealOnce({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (very old browsers) → just show it. Defer out of
    // the effect body so we don't call setState synchronously during the effect.
    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        // .some, not entries[0]: a batched callback (fast fling) can deliver an
        // older not-intersecting record first, and a one-shot that reads only
        // the first record would skip its fire until the next crossing.
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    // Caller className goes on the OBSERVED root: callers pass grid-placement
    // classes (lg:col-span-*) and the grid item is this element — on the inner
    // div they would be inert. The root invariant (see RevealOnce.test.tsx)
    // bans motion classes and offsets here, not layout classes; `is-in` and
    // the motion stay on the inner div.
    <div ref={ref} className={`ronce-root${className ? ` ${className}` : ""}`}>
      <div className={`ronce${inView ? " is-in" : ""}`}>{children}</div>
    </div>
  );
}
