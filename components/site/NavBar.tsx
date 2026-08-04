"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { NAV_SECTIONS } from "@/lib/games";
import { useIntro } from "@/components/site/IntroContext";

/**
 * Left cabinet nav for the home page. Collapsed, it's a single hamburger button in the
 * top-left corner; opening slides a full-height panel in from the left edge and dims
 * the rest of the page behind it.
 *
 * A vertical cabinet is what lets the labels breathe. The previous horizontal bar
 * unfurled rightward along the same line as the hero's top-right social icons, so its
 * width was capped by whatever room the icons left — which clipped the longer labels
 * and, three times running, collided with the icons outright. Stacking the links
 * removes that competition rather than rebalancing it: the panel has a fixed width and
 * the full viewport height, and never reaches the icons at all.
 *
 * Native anchor scrolling (globals sets scroll-behavior: smooth) plus a scroll-spy that
 * glows whatever is in view. Picking a section does NOT close the cabinet (so you can
 * jump between sections); it stays open until dismissed via the button, Escape, or a
 * click on the dimmed area.
 *
 * Background scroll is deliberately left unlocked while open. Locking it means
 * compensating for the scrollbar's width to avoid a layout shift, and getting that
 * wrong is exactly what caused the last round of defects here; leaving it live also
 * keeps the scroll-spy highlight updating behind the dim.
 *
 * The links stay mounted while closed for the slide animation but are `inert`, so they
 * aren't tabbable or announced. The button blinks in on the same timing as the hero's
 * social icons (shared `.intro-blink` class). Section ids/labels come from NAV_SECTIONS.
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
  // The panel's slide is a CSS transition and already respects motion-reduce; the
  // scrim's fade is a motion/react animation, which does not, so gate it here to keep
  // the two consistent (Timeline does the same).
  const reduced = useReducedMotion();
  const [active, setActive] = useState<string>(HOME_ID);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

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

  // While open: Escape closes and returns focus to the button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Move focus to the current section's link once the panel has slid in, so keyboard
  // users land where they are rather than at the top of the list. preventScroll so
  // focusing a link never scrolls the page behind the cabinet.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
      el?.focus({ preventScroll: true });
    }, 320);
    return () => window.clearTimeout(id);
  }, [open]);

  const line =
    "absolute left-0 h-0.5 w-6 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(34,211,238,0.85)] transition-all duration-300";

  const linkBase =
    "inline-flex items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 font-display text-xs uppercase tracking-[0.16em] transition-colors sm:text-sm";

  return (
    <>
      {/* Dimmed backdrop. Also the click-away target, so a click anywhere off the
          cabinet closes it. */}
      <AnimatePresence>
        {open && (
          <motion.div
            data-testid="nav-scrim"
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* The panel itself. Closed, it is translated fully off the left edge — the
          transform is what hides it, so `motion-reduce` may drop the transition's
          duration but must never drop the transform. */}
      <nav
        id="nav-menu"
        ref={panelRef}
        data-testid="nav-cabinet"
        aria-label="Page sections"
        inert={!open}
        className={`fixed inset-y-0 left-0 z-40 w-[22rem] max-w-[85vw] border-r border-white/10 bg-bg/95 backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* pt-24 clears the trigger button, which floats above the panel at z-50 so it
            stays clickable in both states and reads as the cabinet's own ✕ when open. */}
        <ul className="flex h-full flex-col gap-1 overflow-y-auto px-5 pb-10 pt-24">
          <li>
            <a
              href={`#${HOME_ID}`}
              aria-label="Home"
              aria-current={active === HOME_ID ? "true" : undefined}
              className={`${linkBase} ${
                active === HOME_ID
                  ? "bg-neon-blue/10 text-neon-blue text-glow-blue"
                  : "text-muted hover:text-ink"
              }`}
            >
              <HomeIcon />
            </a>
          </li>
          <li aria-hidden className="my-2 h-px w-full bg-white/15" />
          {NAV_SECTIONS.map((s, i) => {
            const isActive = active === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`${linkBase} ${
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

      {/* Trigger — above the panel so it is reachable open or closed. */}
      <button
        ref={btnRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="nav-menu"
        onClick={() => setOpen((o) => !o)}
        className={`intro-blink fixed left-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-bg/70 backdrop-blur-md box-glow-blue sm:left-6 sm:top-6 ${
          phase === "loading" ? "pointer-events-none" : ""
        }`}
      >
        <span className="relative block h-4 w-6">
          <span className={`${line} ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"}`} />
          <span
            className={`${line} top-1/2 -translate-y-1/2 ${open ? "opacity-0" : "opacity-100"}`}
          />
          <span
            className={`${line} ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"}`}
          />
        </span>
      </button>
    </>
  );
}
