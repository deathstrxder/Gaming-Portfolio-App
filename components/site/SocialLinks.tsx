"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

import { YOUTUBE_URL } from "@/lib/games";

const ICON_BUTTON =
  "group flex items-center justify-center rounded-full border border-white/10 bg-bg-elev/70 p-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-neon-blue/50 hover:box-glow-blue";

export function SocialLinks() {
  const [open, setOpen] = useState(false);

  // Close the popup on Escape while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="absolute right-6 top-6 z-20 flex items-center gap-3 sm:right-12 sm:top-12">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show my Discord username"
          className={ICON_BUTTON}
        >
          <Image
            src="/gaming/discord.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(88,101,242,0.8)]"
          />
        </button>
        <a
          href={YOUTUBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Eddie Zeng on YouTube (@deathstrxder)"
          className={ICON_BUTTON}
        >
          <Image
            src="/gaming/youtube.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]"
          />
        </a>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="My Discord username"
              className="hud-corners relative z-10 w-full max-w-md rounded-2xl border border-neon-blue/30 bg-bg-elev/95 p-10 text-center box-glow-blue"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src="/gaming/discord.png"
                alt=""
                width={56}
                height={56}
                className="mx-auto h-14 w-14 object-contain drop-shadow-[0_0_14px_rgba(88,101,242,0.85)]"
              />
              <p className="eyebrow mt-5 text-xs text-neon-blue/80">My Discord Username</p>
              <p className="mt-3 select-all font-display text-3xl font-bold text-neon-blue text-glow-blue sm:text-4xl">
                deathstrxder
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                autoFocus
                className="mt-8 rounded-md border border-white/15 px-6 py-2 font-display text-sm uppercase tracking-[0.2em] text-muted transition-colors hover:border-neon-blue/50 hover:text-ink"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
