import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchYouTube } from "./youtube";

const channelsResponse = {
  items: [
    {
      statistics: { subscriberCount: "1240", viewCount: "88000", videoCount: "42" },
      contentDetails: { relatedPlaylists: { uploads: "UUxxxx" } },
    },
  ],
};

const playlistResponse = {
  items: [
    {
      contentDetails: { videoId: "vid1" },
      snippet: {
        title: "Bridge 50 winstreak",
        publishedAt: "2026-07-20T00:00:00Z",
        thumbnails: { medium: { url: "https://i.ytimg.com/vi/vid1/mqdefault.jpg" } },
      },
    },
    {
      contentDetails: { videoId: "vid2" },
      snippet: {
        title: "Skyblock tour",
        publishedAt: "2026-07-18T00:00:00Z",
        thumbnails: { medium: { url: "https://i.ytimg.com/vi/vid2/mqdefault.jpg" } },
      },
    },
  ],
};

const videosResponse = {
  items: [
    { id: "vid1", statistics: { viewCount: "3021" } },
    { id: "vid2", statistics: { viewCount: "1180" } },
  ],
};

function routeFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/channels")) return new Response(JSON.stringify(channelsResponse));
      if (url.includes("/playlistItems")) return new Response(JSON.stringify(playlistResponse));
      if (url.includes("/videos")) return new Response(JSON.stringify(videosResponse));
      throw new Error(`unexpected url ${url}`);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchYouTube", () => {
  it("returns subscribers and shaped videos in playlist order", async () => {
    routeFetch();
    const data = await fetchYouTube({ apiKey: "k", handle: "@deathstrxder" });

    expect(data.subscribers).toBe(1240);
    expect(data.videos).toHaveLength(2);
    expect(data.videos[0]).toEqual({
      id: "vid1",
      title: "Bridge 50 winstreak",
      thumbnail: "https://i.ytimg.com/vi/vid1/mqdefault.jpg",
      views: 3021,
      publishedAt: "2026-07-20T00:00:00Z",
    });
  });

  it("flags counts above 1000 as rounded by the API", async () => {
    routeFetch();
    const data = await fetchYouTube({ apiKey: "k", handle: "@deathstrxder" });
    expect(data.subscribersAreRounded).toBe(true);
  });

  it("does not flag counts under 1000 as rounded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/channels")) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  statistics: { subscriberCount: "840" },
                  contentDetails: { relatedPlaylists: { uploads: "UUxxxx" } },
                },
              ],
            }),
          );
        }
        if (url.includes("/playlistItems")) return new Response(JSON.stringify({ items: [] }));
        return new Response(JSON.stringify({ items: [] }));
      }),
    );

    const data = await fetchYouTube({ apiKey: "k", handle: "@deathstrxder" });
    expect(data.subscribersAreRounded).toBe(false);
  });

  it("throws when the handle matches no channel", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ items: [] }))));
    await expect(fetchYouTube({ apiKey: "k", handle: "@nobody" })).rejects.toThrow(
      /no YouTube channel/,
    );
  });

  it("returns an empty video list without calling the videos endpoint", async () => {
    const spy = vi.fn(async (url: string) => {
      if (url.includes("/channels")) return new Response(JSON.stringify(channelsResponse));
      if (url.includes("/playlistItems")) return new Response(JSON.stringify({ items: [] }));
      throw new Error("videos endpoint should not be called for an empty playlist");
    });
    vi.stubGlobal("fetch", spy);

    const data = await fetchYouTube({ apiKey: "k", handle: "@deathstrxder" });
    expect(data.videos).toEqual([]);
  });
});
