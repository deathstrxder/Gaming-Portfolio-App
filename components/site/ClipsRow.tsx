import Image from "next/image";

import { YOUTUBE_URL } from "@/lib/games";
import { getLiveStats } from "@/lib/stats/read";
import { formatCompactNumber, formatCount, formatRelativeTime } from "@/lib/stats/format";
import { Reveal } from "@/components/site/Reveal";

export async function ClipsRow() {
  const stats = await getLiveStats();
  const youtube = stats.providers.youtube;
  if (!youtube?.data) return null;

  const { subscribers, subscribersAreRounded } = youtube.data;

  // The API omits `thumbnails.medium` for private, deleted, or live-stream
  // entries, which the provider maps to an empty string (see
  // lib/stats/providers/youtube.ts). Skip those rather than rendering an
  // <Image src=""> — an empty src re-requests the current document in some
  // browsers instead of simply failing to load.
  const videos = youtube.data.videos.filter((video) => video.thumbnail !== "");
  if (videos.length === 0) return null;

  return (
    <section
      id="clips"
      className="mx-auto w-full max-w-[120rem] px-6 pb-16 pt-24 sm:px-10"
    >
      <Reveal from="up">
        <div className="flex flex-wrap items-baseline justify-between gap-6">
          <h2 className="font-display text-6xl font-bold tracking-tight text-ink text-glow-blue sm:text-7xl">
            Latest Clips
          </h2>
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-lg uppercase tracking-[0.2em] text-neon-purple text-glow-purple transition-opacity hover:opacity-80"
          >
            {/* The API rounds counts above 1,000, so an approximate value is
                marked with a tilde rather than presented as exact. */}
            {subscribersAreRounded ? "~" : ""}
            {formatCompactNumber(subscribers)} subscribers
          </a>
        </div>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {videos.map((video) => (
          <Reveal key={video.id} from="up">
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hud-corners group block h-full bg-bg-elev/60 p-4 transition-colors hover:bg-bg-elev"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <Image
                  src={video.thumbnail}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="mt-4 line-clamp-2 font-body text-lg leading-snug text-ink/90">
                {video.title}
              </h3>
              <p className="mt-2 font-body text-sm uppercase tracking-[0.15em] text-muted">
                {formatCount(video.views)} views · {formatRelativeTime(video.publishedAt)}
              </p>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
