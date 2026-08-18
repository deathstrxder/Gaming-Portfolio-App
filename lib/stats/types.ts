/** One provider's slot in the snapshot. `data` is absent when a fetch has never succeeded. */
export type ProviderResult<T> = {
  ok: boolean;
  /** True when this block was carried over from a previous run because the latest fetch failed. */
  stale: boolean;
  fetchedAt: string;
  data?: T;
};

export type YouTubeVideo = {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  publishedAt: string;
};

export type YouTubeData = {
  subscribers: number;
  /** The YouTube API rounds counts above 1,000 to three significant figures. */
  subscribersAreRounded: boolean;
  videos: YouTubeVideo[];
};

/**
 * A `hypixel` provider lived here until the API application was denied. Old
 * published snapshots still carry that block; the schema simply drops it, since
 * zod strips unknown keys by default. Nothing needs to migrate.
 */
export type Snapshot = {
  version: 1;
  generatedAt: string;
  providers: {
    youtube?: ProviderResult<YouTubeData>;
  };
};
