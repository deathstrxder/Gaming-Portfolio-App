"use client";

import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";

import { clampIndex, stepIndex } from "@/lib/clips/carousel";
import { ClipPlayer } from "@/components/site/ClipPlayer";
import type { YouTubeVideo } from "@/lib/stats/types";

const pad = (n: number) => String(n).padStart(2, "0");

const ARROW =
  "flex h-12 w-12 shrink-0 items-center justify-center border border-neon-blue/30 bg-bg-elev/60 text-neon-blue transition-colors hover:border-neon-blue hover:bg-bg-elev hover:text-neon-purple";

/**
 * Both chevrons are 7 wide and 14 tall with their bounding box centred on the
 * 24x24 viewBox, so each sits square in its square button. Drawn from 8.5 to 15.5
 * rather than the obvious whole numbers: 8-15 and 9-16 are each half a unit off
 * centre, in opposite directions, which makes a facing pair look subtly lopsided.
 */
function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d={direction === "left" ? "M15.5 5l-7 7 7 7z" : "M8.5 5l7 7-7 7z"} />
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
      {/* Explicit grid placement rather than a flex row. Flanking arrows cost
          2 × 48px plus gaps, which on a 390px phone left the clip 214px wide —
          a 214 × 120 video. Below `sm` the arrows drop to their own row so the
          clip spans the full width; from `sm` up they flank it as designed. */}
      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-6 sm:grid-cols-[auto_1fr_auto] sm:gap-x-8 sm:gap-y-0">
        {hasControls && (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous clip"
            data-testid="clip-prev"
            className={`${ARROW} col-start-1 row-start-2 justify-self-start sm:col-start-1 sm:row-start-1`}
          >
            <Chevron direction="left" />
          </button>
        )}

        {/* The counter shares this column so it right-aligns with the clip rather
            than with the outer container, which left it floating past the edge. */}
        <div className="col-span-2 row-start-1 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          {hasControls && (
            <p
              data-testid="clip-counter"
              className="eyebrow mb-6 text-right text-sm text-neon-blue/80"
            >
              {pad(index + 1)} <span className="text-muted/60">/</span> {pad(total)}
            </p>
          )}

          <div className="clip-stack">
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
        </div>

        {hasControls && (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next clip"
            data-testid="clip-next"
            className={`${ARROW} col-start-2 row-start-2 justify-self-end sm:col-start-3 sm:row-start-1`}
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
