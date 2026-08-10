"use client";

import Image from "next/image";

import { formatCount, formatRelativeTime } from "@/lib/stats/format";
import type { YouTubeVideo } from "@/lib/stats/types";

/**
 * The embed used once a visitor presses play.
 *
 * `youtube-nocookie.com` avoids setting tracking cookies for the visitors who
 * never press play — which, behind a facade, is most of them. `rel=0` keeps the
 * end-screen suggestions within this channel rather than advertising other
 * creators on Eddie's own page.
 */
export function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
}

/**
 * One clip. Controlled: `isPlaying` is owned by ClipsCarousel, not here.
 *
 * Lifting that state is what makes "changing clips stops playback" structural —
 * the carousel clears it in the same handler that moves the index, so there is no
 * effect to fire and no ordering in which a hidden layer keeps playing audio.
 *
 * Before activation this renders a facade — thumbnail plus a play control, no
 * iframe. Mounting twelve YouTube embeds on page load would pull twelve player
 * bundles for a section the visitor may never scroll to.
 */
export function ClipPlayer({
  video,
  isPlaying,
  onPlay,
  priority = false,
}: {
  video: YouTubeVideo;
  isPlaying: boolean;
  onPlay: () => void;
  priority?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="hud-corners relative aspect-video w-full overflow-hidden bg-bg-elev/60">
        {isPlaying ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={embedUrl(video.id)}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Play ${video.title}`}
            data-testid="clip-play"
            className="group absolute inset-0 block h-full w-full"
          >
            <Image
              src={video.thumbnail}
              alt=""
              fill
              priority={priority}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span
              aria-hidden="true"
              className="box-glow-blue absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-bg/70 text-neon-blue backdrop-blur-sm transition-colors group-hover:bg-bg/85 group-hover:text-neon-purple"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-[2px] fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      <h3 className="mt-5 line-clamp-2 font-body text-xl leading-snug text-ink/90">
        {video.title}
      </h3>
      <p className="eyebrow mt-2 text-sm text-muted">
        {formatCount(video.views)} views · {formatRelativeTime(video.publishedAt)}
      </p>
    </div>
  );
}
