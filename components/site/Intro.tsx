"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type Direction = "left" | "right" | "up";

const OFFSET = 160;

/**
 * One-time entrance animation that plays on mount — used for the above-the-fold home
 * content that is already in view on first load, where a scroll-linked reveal would
 * never trigger. Deliberately slow and pronounced so the page opening is felt.
 *
 * The entrance waits for web fonts to finish loading before it starts. Otherwise the
 * font swaps in mid-animation and the glowing/gradient text re-rasterizes, which
 * reads as choppy (images don't have this problem, which is why the portrait is
 * smooth but the text was not).
 */
export function Intro({
  children,
  from = "left",
  delay = 0,
  className,
}: {
  children: ReactNode;
  from?: Direction;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const start = () => {
      if (active) setReady(true);
    };
    // Start once fonts are ready, with a safety timeout so text can never get stuck.
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (fonts?.ready) {
      fonts.ready.then(start);
    }
    const timer = setTimeout(start, 1200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const x = from === "left" ? -OFFSET : from === "right" ? OFFSET : 0;
  const y = from === "up" ? OFFSET : 0;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y }}
      animate={ready ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x, y }}
      transition={{ duration: 3.2, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
