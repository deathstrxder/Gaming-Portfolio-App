"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { NAV_SECTIONS } from "@/lib/games";
import { useIntro } from "@/components/site/IntroContext";

/**
 * Left-side floating HUD nav for the home page. Collapsed, it's a single hamburger
 * button in the top-left corner (mirroring the hero's top-right social icons — same
 * top offset and inset). Clicking it expands the bar horizontally to the right,
 * unfurling the original pill: a Home link, then one numbered link per section.
 * Native anchor scrolling (globals sets scroll-behavior: smooth) plus a scroll-spy
 * that glows whatever is in view — the active section stays highlighted in the bar.
 * Picking a section does NOT close the bar (so you can jump between sections); it
 * stays open until the user dismisses it via the hamburger, Escape, or a click-away.
 *
 * The reveal is a grid 0fr→1fr expansion (clips to the hamburger when closed, settles
 * at the bar's natural width when open) so it animates open AND closed. The links stay
 * mounted for the collapse animation but are `inert` when closed, so they aren't
 * tabbable or announced. The button blinks in on the same timing as the hero's social
 * icons (shared `.intro-blink` class). Section ids/labels come from NAV_SECTIONS.
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
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // The active section, mirrored in a ref so the on-open positioning effect can read
  // the latest value without re-running each time you scroll past a section.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

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

  // Smoothly scroll a link to the centre of the (scrollable) bar, clamped so the
  // first/last links don't over-scroll past the ends — "centre it if possible".
  const centerInBar = useCallback((el: HTMLElement | null) => {
    const menu = menuRef.current;
    if (!menu || !el) return;
    const c = menu.getBoundingClientRect();
    const e = el.getBoundingClientRect();
    const center = e.left - c.left + menu.scrollLeft + e.width / 2 - menu.clientWidth / 2;
    const max = menu.scrollWidth - menu.clientWidth;
    menu.scrollTo({ left: Math.max(0, Math.min(center, max)), behavior: "smooth" });
  }, []);

  // When the bar opens, position the scroll so the current section is in view: home
  // stays at the start (its icon sits clear of the X); any other section is centred.
  // Runs after the ~300ms unfurl (so the width has settled), then moves focus to the
  // active link for keyboard users — preventScroll so it doesn't undo the centring.
  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    menu.scrollLeft = 0; // home sits at the start as the bar unfurls
    const id = window.setTimeout(() => {
      const el = menu.querySelector<HTMLElement>('[aria-current="true"]');
      if (el && activeRef.current !== HOME_ID) centerInBar(el);
      el?.focus({ preventScroll: true });
    }, 320);
    return () => window.clearTimeout(id);
  }, [open, centerInBar]);

  const line =
    "absolute left-0 h-0.5 w-6 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(34,211,238,0.85)] transition-all duration-300";

  return (
    <>
      {/* Click-away catcher — closes the bar when clicking anywhere else. */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <nav
        aria-label="Page sections"
        className={`intro-blink fixed left-4 top-4 z-40 flex h-[66px] items-center sm:left-6 sm:top-6 ${
          phase === "loading" ? "pointer-events-none" : ""
        }`}
      >
        <div className="flex h-12 max-w-[calc(100vw-2rem)] items-center rounded-full border border-white/10 bg-bg/70 backdrop-blur-md box-glow-blue sm:max-w-[calc(100vw-3rem)]">
          <button
            ref={btnRef}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav-menu"
            onClick={() => setOpen((o) => !o)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
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

          {/* Horizontal reveal: grid column animates 0fr → 1fr, so the bar unfurls to
              the right and settles at the links' natural width. */}
          <div
            className="grid min-w-0 transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none"
            style={{ gridTemplateColumns: open ? "1fr" : "0fr" }}
          >
            {/* Scrolls horizontally when the links are wider than the (viewport-capped)
                bar, so every section stays reachable on small screens. Scrollbar hidden;
                swipe / trackpad to scroll. */}
            <div
              id="nav-menu"
              ref={menuRef}
              inert={!open}
              className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <ul className="flex items-center gap-1 whitespace-nowrap py-1.5 pl-1 pr-3">
                <li className="shrink-0">
                  <a
                    href={`#${HOME_ID}`}
                    aria-label="Home"
                    aria-current={active === HOME_ID ? "true" : undefined}
                    onClick={(e) => centerInBar(e.currentTarget)}
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
                        onClick={(e) => centerInBar(e.currentTarget)}
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
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
