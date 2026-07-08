"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

/**
 * The home page's animated GIF backdrop: slightly blurred and dimmed, fading up from
 * darkness on first load, and fading into the next section along its bottom edge.
 */
export function HomeBackdrop() {
  const reduced = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Image
        src="/gaming/background.gif"
        alt=""
        fill
        sizes="100vw"
        className="scale-105 object-cover blur-sm"
      />
      {/* Dimming scrim — keeps the foreground readable */}
      <div className="absolute inset-0 bg-bg/70" />
      {/* Fade into the next section along the bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bg" />
      {/* Fade in from darkness on page open */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={reduced ? false : { opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
    </div>
  );
}
