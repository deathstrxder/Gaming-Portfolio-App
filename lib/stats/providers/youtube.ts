import type { YouTubeData, YouTubeVideo } from "@/lib/stats/types";

const API = "https://www.googleapis.com/youtube/v3";

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url.split("?")[0]} responded ${response.status}`);
  return response.json();
}

export async function fetchYouTube(opts: {
  apiKey: string;
  handle: string;
  limit?: number;
}): Promise<YouTubeData> {
  const limit = opts.limit ?? 4;

  const channels = (await getJson(
    `${API}/channels?part=statistics,contentDetails&forHandle=${encodeURIComponent(opts.handle)}&key=${opts.apiKey}`,
  )) as {
    items?: {
      statistics?: { subscriberCount?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }[];
  };

  const channel = channels.items?.[0];
  if (!channel) throw new Error(`no YouTube channel for handle "${opts.handle}"`);

  const subscribers = Number(channel.statistics?.subscriberCount ?? 0);
  const uploadsPlaylist = channel.contentDetails?.relatedPlaylists?.uploads;

  const videos = uploadsPlaylist
    ? await fetchRecentVideos(opts.apiKey, uploadsPlaylist, limit)
    : [];

  return {
    subscribers,
    // YouTube rounds subscriber counts to three significant figures above 1,000.
    // There is no workaround, so the snapshot records that the value is approximate.
    subscribersAreRounded: subscribers >= 1000,
    videos,
  };
}

async function fetchRecentVideos(
  apiKey: string,
  playlistId: string,
  limit: number,
): Promise<YouTubeVideo[]> {
  const playlist = (await getJson(
    `${API}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${limit}&key=${apiKey}`,
  )) as {
    items?: {
      contentDetails?: { videoId?: string };
      snippet?: {
        title?: string;
        publishedAt?: string;
        thumbnails?: { medium?: { url?: string } };
      };
    }[];
  };

  const items = (playlist.items ?? []).filter((item) => item.contentDetails?.videoId);
  if (items.length === 0) return [];

  // View counts are not on playlistItems, so one batched videos call fills them in.
  const ids = items.map((item) => item.contentDetails!.videoId!).join(",");
  const videos = (await getJson(
    `${API}/videos?part=statistics&id=${ids}&key=${apiKey}`,
  )) as { items?: { id?: string; statistics?: { viewCount?: string } }[] };

  const viewsById = new Map<string, number>(
    (videos.items ?? []).map((item) => [item.id ?? "", Number(item.statistics?.viewCount ?? 0)]),
  );

  return items.map((item) => {
    const id = item.contentDetails!.videoId!;
    return {
      id,
      title: item.snippet?.title ?? "Untitled",
      thumbnail: item.snippet?.thumbnails?.medium?.url ?? "",
      views: viewsById.get(id) ?? 0,
      publishedAt: item.snippet?.publishedAt ?? "",
    };
  });
}
