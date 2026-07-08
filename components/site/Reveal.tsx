"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

type Direction = "left" | "right" | "up";

const OFFSET = 120;

/**
 * Scroll-linked reveal: content slides in from the side (or up) and fades in as it
 * enters the viewport, then drifts out and fades away as it scrolls past — in both
 * directions — so there is continuous motion while scrolling up or down.
 */
export function Reveal({
  children,
  from = "left",
  exit = "origin",
  className,
}: {
  children: ReactNode;
  from?: Direction;
  /** "origin" drifts back out the way it came; "through" exits the opposite edge. */
  exit?: "origin" | "through";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // A light, responsive spring: enough to smooth wheel steps without trailing behind
  // the scroll (low mass + higher stiffness keeps it tracking closely = less lag).
  const progress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 30,
    mass: 0.2,
  });

  const xOff = from === "left" ? -OFFSET : from === "right" ? OFFSET : 0;
  const yOff = from === "up" ? OFFSET : 0;
  // "origin": drift back out the way it came. "through": exit the opposite edge
  // (e.g. enter from the bottom, leave out the top when scrolling down).
  const exitSign = exit === "through" ? -1 : 1;

  // Enters over the first ~quarter, holds fully visible through the middle, then
  // drifts out and fades over the last stretch (only once it is nearly scrolled past).
  const opacity = useTransform(progress, [0, 0.28, 0.78, 1], [0, 1, 1, 0]);
  const x = useTransform(progress, [0, 0.28, 0.78, 1], [xOff, 0, 0, xOff * exitSign]);
  const y = useTransform(progress, [0, 0.28, 0.78, 1], [yOff, 0, 0, yOff * exitSign]);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ opacity, x, y, willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
