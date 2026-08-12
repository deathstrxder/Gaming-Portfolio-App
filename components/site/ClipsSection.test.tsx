import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClipsEmptyState, selectClips } from "@/components/site/ClipsSection";
import type { YouTubeVideo } from "@/lib/stats/types";

const video = (id: string, thumbnail: string): YouTubeVideo => ({
  id,
  title: `Clip ${id}`,
  thumbnail,
  views: 10,
  publishedAt: "2026-08-07T12:00:00.000Z",
});

describe("selectClips", () => {
  // The provider maps private, deleted, and live entries to "". An <Image src="">
  // re-requests the current document in some browsers instead of failing to load.
  it("drops entries with no usable thumbnail", () => {
    const picked = selectClips([
      video("a", "https://i.ytimg.com/vi/a/maxresdefault.jpg"),
      video("b", ""),
      video("c", "https://i.ytimg.com/vi/c/maxresdefault.jpg"),
    ]);
    expect(picked.map((v) => v.id)).toEqual(["a", "c"]);
  });

  it("returns an empty array when the provider block is absent", () => {
    expect(selectClips(undefined)).toEqual([]);
  });

  it("keeps the snapshot's order, which is newest first", () => {
    const picked = selectClips([
      video("new", "https://i.ytimg.com/vi/new/maxresdefault.jpg"),
      video("old", "https://i.ytimg.com/vi/old/maxresdefault.jpg"),
    ]);
    expect(picked.map((v) => v.id)).toEqual(["new", "old"]);
  });
});

describe("ClipsEmptyState", () => {
  // The nav gained a "Latest Clips" entry in e202262. Returning null when the
  // snapshot has no YouTube block leaves that nav link scrolling nowhere.
  it("links to the channel so the nav anchor always resolves", () => {
    const html = renderToStaticMarkup(<ClipsEmptyState />);
    expect(html).toContain("https://www.youtube.com/@deathstrxder");
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
