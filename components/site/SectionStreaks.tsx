import type { CSSProperties } from "react";

/**
 * SectionStreaks — a decorative field of diagonal neon light-streaks that sits
 * behind the non-home sections (the fixed z-index:-1 slot the old GIF used).
 *
 * It's deliberately near-zero-cost: the motion is pure CSS (see `.section-streaks`
 * and `.streak` in globals.css) animating only `transform`, which the browser runs
 * on the compositor thread. No JS, no requestAnimationFrame, no image decode — so
 * it can't compete with scrolling the way the animated GIF did.
 *
 * Rendered on the server (no "use client"): every streak's position, length,
 * speed, colour and phase are derived deterministically from its index, so the
 * markup is identical on server and client — no randomness, no hydration drift.
 */

const STREAK_COUNT = 12;

export function SectionStreaks() {
  return (
    <div className="section-streaks" aria-hidden>
      {Array.from({ length: STREAK_COUNT }, (_, i) => {
        // Cheap integer hashes keep the field irregular without Math.random
        // (which would differ between server and client and break hydration).
        const left = (i * 37) % 100; // 0–96%, well spread across the width
        const duration = 6 + ((i * 29) % 60) / 10; // 6.0–11.8s per fall
        const delay = -(((i * 13) % 80) / 10); // −0 to −7.8s → start mid-flight
        const length = 35 + ((i * 23) % 20); // 35–53vh trail
        const opacity = 0.3 + ((i * 17) % 5) / 20; // 0.30–0.50
        const color =
          i % 4 === 0 ? "var(--color-neon-purple)" : "var(--color-neon-blue)";

        return (
          <span
            key={i}
            className="streak"
            style={
              {
                left: `${left}%`,
                "--dur": `${duration}s`,
                "--delay": `${delay}s`,
                "--len": `${length}vh`,
                "--streak-opacity": opacity,
                "--streak-color": color,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
