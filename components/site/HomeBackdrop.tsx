"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * The home page's animated GIF backdrop: slightly blurred and dimmed. It sits in
 * place; the PixelReveal curtain layered over it handles the opening reveal.
 *
 * Once the hero scrolls off-screen it fades out and its visibility flips to hidden,
 * which stops the browser from decoding the GIF — no wasted work (or scroll jank)
 * while you read the rest of the page. It fades straight back in on return.
 */
export function HomeBackdrop({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      rootMargin: "120px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className ?? ""}`}
      style={{
        opacity: onScreen ? 1 : 0,
        visibility: onScreen ? "visible" : "hidden",
        // Fade out, then flip to hidden (stopping the GIF); reappear instantly on return.
        transition: onScreen ? "opacity 400ms ease" : "opacity 400ms ease, visibility 0s 400ms",
      }}
    >
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
    </div>
  );
}
