import { getLiveStats } from "@/lib/stats/read";
import { YOUTUBE_URL } from "@/lib/games";
import { Reveal } from "@/components/site/Reveal";
import { ClipsCarousel } from "@/components/site/ClipsCarousel";
import type { YouTubeVideo } from "@/lib/stats/types";

/**
 * Keeps only the clips that can actually be rendered.
 *
 * The API omits `thumbnails` for private, deleted, and live-stream entries, which
 * the provider maps to an empty string (lib/stats/providers/youtube.ts). Rendering
 * `<Image src="">` for those makes some browsers re-request the current document
 * rather than simply failing to load.
 */
export function selectClips(videos: YouTubeVideo[] | undefined): YouTubeVideo[] {
  return (videos ?? []).filter((video) => video.thumbnail !== "");
}

/**
 * Shown when the snapshot carries no usable clips.
 *
 * The nav gained a "Latest Clips" entry in e202262, so rendering nothing here
 * leaves a nav link that scrolls nowhere — a broken control in the shipped site.
 * The heading and this fallback keep the anchor resolvable in every data state.
 */
export function ClipsEmptyState() {
  return (
    <p className="mt-10 font-body text-lg text-muted">
      Fresh clips are on the way.{" "}
      <a
        href={YOUTUBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-neon-blue underline-offset-4 transition-colors hover:text-neon-purple hover:underline"
      >
        Watch them on YouTube
      </a>{" "}
      in the meantime.
    </p>
  );
}

export async function ClipsSection() {
  const stats = await getLiveStats();
  const clips = selectClips(stats.providers.youtube?.data?.videos);

  return (
    <section
      id="clips"
      className="mx-auto w-full max-w-[120rem] px-6 pb-16 pt-24 sm:px-10"
    >
      <Reveal from="up">
        <h2 className="font-display text-6xl font-bold tracking-tight text-ink text-glow-blue sm:text-7xl">
          Latest Clips
        </h2>
      </Reveal>

      <div className="mx-auto max-w-6xl">
        {clips.length > 0 ? <ClipsCarousel videos={clips} /> : <ClipsEmptyState />}
      </div>
    </section>
  );
}
