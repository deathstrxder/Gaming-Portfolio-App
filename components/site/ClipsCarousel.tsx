"use client";

import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";

import { clampIndex, stepIndex } from "@/lib/clips/carousel";
import { ClipPlayer } from "@/components/site/ClipPlayer";
import type { YouTubeVideo } from "@/lib/stats/types";

const pad = (n: number) => String(n).padStart(2, "0");

const ARROW =
  "flex h-12 w-12 shrink-0 items-center justify-center border border-neon-blue/30 bg-bg-elev/60 text-neon-blue transition-colors hover:border-neon-blue hover:bg-bg-elev hover:text-neon-purple";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d={direction === "left" ? "M15 5l-7 7 7 7z" : "M9 5l7 7-7 7z"} />
    </svg>
  );
}

/**
 * One clip at a time, cross-fading between clips.
 *
 * Every clip is rendered, stacked into a single grid cell (`.clip-stack` in
 * globals.css); only the active layer is opaque. Stacking rather than swapping is
 * what makes this a real cross-fade — both layers are on screen mid-transition,
 * instead of the outgoing clip fading to an empty box before the next appears —
 * and it means every thumbnail is already in the DOM, so stepping never flashes
 * an empty frame while an image loads.
 *
 * `playingIndex` lives here rather than inside each ClipPlayer so that navigating
 * away from a playing clip cannot leave audio coming from a layer nobody can see:
 * the same handler moves the index and clears playback, so there is no effect to
 * fire and no ordering in which the two can disagree.
 */
export function ClipsCarousel({ videos }: { videos: YouTubeVideo[] }) {
  const [index, setIndex] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const total = videos.length;
  const hasControls = total > 1;

  const goTo = useCallback((next: number) => {
    setIndex(next);
    setPlayingIndex(null);
  }, []);

  const step = useCallback(
    (delta: number) => goTo(stepIndex(index, delta, total)),
    [goTo, index, total],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!hasControls) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    },
    [hasControls, step],
  );

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Latest clips"
      data-testid="clips-carousel"
      onKeyDown={onKeyDown}
      className="mt-10"
    >
      {hasControls && (
        <p
          data-testid="clip-counter"
          className="eyebrow mb-6 text-right text-sm text-neon-blue/80"
        >
          {pad(index + 1)} <span className="text-muted/60">/</span> {pad(total)}
        </p>
      )}

      <div className="flex items-center gap-4 sm:gap-8">
        {hasControls && (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous clip"
            data-testid="clip-prev"
            className={ARROW}
          >
            <Chevron direction="left" />
          </button>
        )}

        <div className="clip-stack min-w-0 flex-1">
          {videos.map((video, i) => {
            const isActive = i === index;
            return (
              <div
                key={video.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Clip ${i + 1} of ${total}`}
                data-testid="clip-layer"
                data-active={isActive ? "true" : "false"}
                aria-hidden={!isActive || undefined}
                inert={!isActive}
                className={`clip-layer${isActive ? " is-active" : ""}`}
              >
                <ClipPlayer
                  video={video}
                  isPlaying={playingIndex === i}
                  onPlay={() => setPlayingIndex(i)}
                  priority={i === 0}
                />
              </div>
            );
          })}
        </div>

        {hasControls && (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next clip"
            data-testid="clip-next"
            className={ARROW}
          >
            <Chevron direction="right" />
          </button>
        )}
      </div>

      {hasControls && (
        <div className="mt-8 flex items-center justify-center gap-3">
          {videos.map((video, i) => (
            <button
              key={video.id}
              type="button"
              onClick={() => goTo(clampIndex(i, total))}
              aria-label={`Show clip ${i + 1}: ${video.title}`}
              aria-current={i === index ? "true" : undefined}
              data-testid="clip-dot"
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === index ? "bg-neon-blue box-glow-blue" : "bg-muted/30 hover:bg-muted/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
