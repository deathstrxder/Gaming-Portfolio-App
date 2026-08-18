"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * The auth panel's section. Named here rather than inlined because the intro
 * deliberately suppresses hash scrolling, and this is the single documented
 * exception to that rule — a reader needs to see why one id is special.
 */
const AUTH_SECTION_ID = "support";
const AUTH_SECTION_HASH = `#${AUTH_SECTION_ID}`;

// Layout effect on the client (runs before paint, so the title/button hand-off
// lands in one frame), plain effect on the server (no-op, avoids the SSR warning).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Coordinates the opening sequence across the loading bar (IntroBar) and the Eddie
 * elements that reveal after it.
 *
 *   loading   → title types out while the bar sweeps; background/portrait/buttons hidden.
 *   revealing → bar has blinked away; background flies up and portrait/buttons blink in.
 *   done      → everything settled and interactive.
 *
 * The phase is mirrored onto <html data-intro-phase> so the reveal animations are
 * driven entirely from CSS.
 */
export type IntroPhase = "loading" | "revealing" | "done";

const IntroContext = createContext<{
  phase: IntroPhase;
  setPhase: (p: IntroPhase) => void;
} | null>(null);

export function useIntro() {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error("useIntro must be used within <IntroProvider>");
  return ctx;
}

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>("loading");

  // Mirror the phase onto <html> so CSS drives the slide + Eddie-title hand-off.
  // Layout effect so revealing the real Eddie title happens in the same paint as
  // the splash unmounting — otherwise the title flashes out for a frame at the seam.
  useIsoLayoutEffect(() => {
    document.documentElement.dataset.introPhase = phase;
  }, [phase]);

  /**
   * The one hash the intro yields to.
   *
   * The auth panel lives in `#support`, and the sign-in flow sends people back
   * to it from off-site: a Google sign-in for a new account needs a username, a
   * claimed account has a notice to read, an OAuth failure has an error to
   * show. Scrolling those arrivals to the top strands someone mid-task at the
   * hero, hunting for the panel they were just using.
   *
   * Captured at mount rather than read later, because the panel itself writes
   * `#support` into the URL as the user advances — that is for surviving a
   * refresh, and must not retroactively change what this arrival meant.
   */
  const landedOnPanelRef = useRef(false);

  // Never auto-restore scroll (or jump to a #game hash) on load — the intro always
  // starts at the top of EddieHome. The auth section is the documented exception.
  useEffect(() => {
    landedOnPanelRef.current = window.location.hash === AUTH_SECTION_HASH;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  // Lock scroll until the reveal finishes; keep the view pinned to the top so the
  // page never autoscrolls to a section after the intro completes.
  useEffect(() => {
    const html = document.documentElement;
    html.style.overflow = phase === "done" ? "" : "hidden";
    if (phase !== "done") {
      return () => {
        html.style.overflow = "";
      };
    }

    // Scroll is unlocked only now, so the browser's own jump to the fragment on
    // load was discarded while `overflow: hidden` was in force. Redoing it here
    // is what actually lands the user on the panel.
    const target = landedOnPanelRef.current
      ? document.getElementById(AUTH_SECTION_ID)
      : null;
    if (target) {
      // Instant, not smooth: they are part-way through signing in, and a long
      // glide down the page is latency, not polish.
      target.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      html.style.overflow = "";
    };
  }, [phase]);

  // Once the slide has played, settle into the final (interactive) state.
  useEffect(() => {
    if (phase !== "revealing") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setPhase("done"), reduced ? 30 : 3300);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <IntroContext.Provider value={{ phase, setPhase }}>
      {children}
    </IntroContext.Provider>
  );
}
