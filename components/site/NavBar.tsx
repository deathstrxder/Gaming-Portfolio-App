"use client";

import { useEffect, useState } from "react";

import { NAV_SECTIONS } from "@/lib/games";
import { useIntro } from "@/components/site/IntroContext";

/**
 * Left-side floating HUD nav for the home page, positioned to mirror the hero's
 * top-right social icons (same top offset, same inset from its edge, and — via the
 * 66px band below — the same height, so their center axes line up). A home icon
 * leads, then a link per section; native anchor scrolling (globals sets
 * scroll-behavior: smooth) plus a scroll-spy that glows whatever is in view. Sits
 * below the social modal (z-50) and blinks in on the same timing as the hero's
 * social icons — both share the `.intro-blink` class driven by the intro phase.
 *
 * Section ids/labels come from NAV_SECTIONS (lib/games); "home" is the EddieHome
 * section at the top.
 */
const HOME_ID = "home";

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.15em] w-[1.15em]"
      aria-hidden
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

export function NavBar() {
  const { phase } = useIntro();
  const [active, setActive] = useState<string>(HOME_ID);

  // Scroll-spy: whichever section is crossing the middle of the viewport is active.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const id of [HOME_ID, ...NAV_SECTIONS.map((s) => s.id)]) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className={`intro-blink fixed left-4 top-4 z-40 flex h-[66px] items-center sm:left-6 sm:top-6 ${
        phase === "loading" ? "pointer-events-none" : ""
      }`}
    >
      <ul className="inline-flex max-w-[calc(100vw-9rem)] items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-bg/70 px-2 py-1.5 backdrop-blur-md box-glow-blue">
        <li className="shrink-0">
          <a
            href={`#${HOME_ID}`}
            aria-label="Home"
            aria-current={active === HOME_ID ? "true" : undefined}
            className={`flex items-center rounded-full px-3 py-1.5 text-base transition-colors ${
              active === HOME_ID ? "text-neon-blue text-glow-blue" : "text-muted hover:text-ink"
            }`}
          >
            <HomeIcon />
          </a>
        </li>
        <li aria-hidden className="mx-1 h-5 w-px shrink-0 bg-white/15" />
        {NAV_SECTIONS.map((s, i) => {
          const isActive = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-xs uppercase tracking-[0.16em] transition-colors sm:text-sm ${
                  isActive
                    ? "bg-neon-blue/10 text-neon-blue text-glow-blue"
                    : "text-muted hover:text-ink"
                }`}
              >
                <span
                  className={`text-[0.72em] tabular-nums ${
                    isActive ? "text-neon-blue" : "text-neon-blue/45"
                  }`}
                >
                  0{i + 1}
                </span>
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
