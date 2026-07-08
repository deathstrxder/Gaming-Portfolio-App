"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { TIMELINE } from "@/lib/games";
import { Button } from "@/components/ui/button";

const N = TIMELINE.length;

export function Timeline() {
  const reduced = useReducedMotion();
  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);

  // How many events fit in the ~one-third window, responsive to screen width.
  // The handler also re-clamps the window so it never runs past the last event.
  useEffect(() => {
    const sm = window.matchMedia("(max-width: 640px)");
    const md = window.matchMedia("(max-width: 1024px)");
    const update = () => {
      const next = sm.matches ? 1 : md.matches ? 2 : 3;
      setPerView(next);
      setIndex((i) => Math.min(i, Math.max(0, N - next)));
    };
    update();
    sm.addEventListener("change", update);
    md.addEventListener("change", update);
    return () => {
      sm.removeEventListener("change", update);
      md.removeEventListener("change", update);
    };
  }, []);

  const maxIndex = Math.max(0, N - perView);
  // Clamp on render as a safety net (e.g. right after a width change).
  const activeIndex = Math.min(index, maxIndex);

  const atStart = activeIndex <= 0;
  const atEnd = activeIndex >= maxIndex;

  const stepPct = 100 / N; // width of one event as a % of the full track
  const trackWidth = `${(N / perView) * 100}%`;
  const x = `-${stepPct * activeIndex}%`;

  // Soft, slow spring for a smooth glide between years.
  const transition = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 55, damping: 20, mass: 0.9 };

  const visibleRange = `${TIMELINE[activeIndex].year} – ${TIMELINE[Math.min(activeIndex + perView - 1, N - 1)].year}`;

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-28 sm:px-10">
      <h2 className="font-display text-5xl font-bold tracking-tight text-ink text-glow-purple sm:text-6xl">
        Dates I Started Playing New Games
      </h2>

      {/* Windowed track */}
      <div className="relative mt-20 overflow-hidden">
        <motion.div
          className="relative flex h-[30rem]"
          style={{ width: trackWidth }}
          animate={{ x }}
          transition={transition}
        >
          {/* the neon rail, spanning the whole track so it pans with the markers */}
          <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-neon-blue/50 via-neon-blue/60 to-neon-purple/60 shadow-[0_0_12px_rgba(34,211,238,0.4)]" />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 font-display text-2xl text-neon-purple">
            ›
          </span>

          {TIMELINE.map((event, i) => {
            const above = i % 2 === 0;
            const active = i >= activeIndex && i < activeIndex + perView;
            return (
              <div
                key={event.year}
                className="relative flex-none"
                style={{ flexBasis: `${100 / N}%` }}
              >
                {/* node on the rail */}
                <span
                  className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-300 ${
                    active
                      ? "border-neon-blue bg-neon-blue shadow-[0_0_16px_rgba(34,211,238,0.9)]"
                      : "border-white/30 bg-bg"
                  }`}
                />
                {/* connector from rail to card */}
                <span
                  className={`absolute left-1/2 w-px -translate-x-1/2 bg-white/20 ${
                    above ? "bottom-1/2 h-10" : "top-1/2 h-10"
                  }`}
                />
                {/* event card */}
                <div
                  className={`absolute left-1/2 w-44 -translate-x-1/2 ${
                    above ? "bottom-[calc(50%+2.5rem)]" : "top-[calc(50%+2.5rem)]"
                  }`}
                >
                  <div
                    className={`hud-corners relative rounded-lg border bg-bg-elev/90 p-4 text-center transition-all duration-300 ${
                      active
                        ? "border-neon-blue/40 box-glow-blue"
                        : "border-white/10 opacity-60"
                    }`}
                  >
                    <div className="relative mx-auto h-14 w-14">
                      <Image
                        src={event.game.icon}
                        alt={event.game.name}
                        fill
                        sizes="56px"
                        className="object-contain"
                      />
                    </div>
                    <p className="mt-2 font-display text-2xl font-bold text-neon-blue">
                      {event.year}
                    </p>
                    <p className="font-body text-sm uppercase tracking-wide text-muted">
                      {event.game.name}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Controls */}
      <div className="mt-14 flex items-center justify-center gap-6">
        <Button
          variant="neon"
          onClick={() => setIndex(Math.max(0, activeIndex - 1))}
          disabled={atStart}
          aria-label="Previous year"
        >
          ‹ Prev
        </Button>
        <span className="min-w-[8rem] text-center font-display text-base uppercase tracking-[0.2em] text-muted">
          {visibleRange}
        </span>
        <Button
          variant="purple"
          onClick={() => setIndex(Math.min(maxIndex, activeIndex + 1))}
          disabled={atEnd}
          aria-label="Next year"
        >
          Next ›
        </Button>
      </div>
    </section>
  );
}
