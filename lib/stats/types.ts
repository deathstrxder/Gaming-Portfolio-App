/** One provider's slot in the snapshot. `data` is absent when a fetch has never succeeded. */
export type ProviderResult<T> = {
  ok: boolean;
  /** True when this block was carried over from a previous run because the latest fetch failed. */
  stale: boolean;
  fetchedAt: string;
  data?: T;
};

export type BridgeStats = {
  title: string;
  wins: number;
  losses: number;
  wlr: number;
  bestWinstreak: number;
};

export type SkyblockStats = {
  networth: number;
  profileName: string;
};

/** Skyblock is optional on its own — networth computation can fail while Bridge still publishes. */
export type HypixelData = {
  bridge: BridgeStats;
  skyblock?: SkyblockStats;
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

export type Snapshot = {
  version: 1;
  generatedAt: string;
  providers: {
    hypixel?: ProviderResult<HypixelData>;
    youtube?: ProviderResult<YouTubeData>;
  };
};
