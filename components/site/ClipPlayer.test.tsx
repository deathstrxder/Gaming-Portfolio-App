import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClipPlayer, embedUrl } from "@/components/site/ClipPlayer";
import type { YouTubeVideo } from "@/lib/stats/types";

const video: YouTubeVideo = {
  id: "abc123",
  title: "Insane 1v4 clutch",
  thumbnail: "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
  views: 12400,
  publishedAt: "2026-08-07T12:00:00.000Z",
};

describe("embedUrl", () => {
  it("builds a privacy-preserving autoplaying embed", () => {
    expect(embedUrl("abc123")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123?autoplay=1&rel=0",
    );
  });

  // An id is interpolated straight into a URL, so it gets escaped rather than trusted.
  it("escapes an id rather than interpolating it raw", () => {
    expect(embedUrl("a/b?c")).toBe(
      "https://www.youtube-nocookie.com/embed/a%2Fb%3Fc?autoplay=1&rel=0",
    );
  });
});

/**
 * Collects every image source in the markup, resolved back to the URL it points at.
 *
 * `next/image` routes the src through whichever loader is configured. Production
 * uses the custom loader (image-loader.ts), which passes remote URLs through
 * untouched; a bare `renderToStaticMarkup` outside a Next build falls back to the
 * default loader, which percent-encodes the URL into a `/_next/image?url=…` query.
 * Unwrapping that query makes these assertions true under either loader.
 *
 * Only the source attributes are decoded, never the whole document — the inline
 * `width:100%` in Next's fill styling is not a valid escape sequence, so
 * decodeURIComponent over the full markup throws URIError.
 */
const imageSources = (html: string): string =>
  Array.from(html.matchAll(/(?:src|srcSet)="([^"]*)"/g))
    .map(([, value]) => {
      const raw = value.replace(/&amp;/g, "&");
      const wrapped = /[?&]url=([^&\s]+)/.exec(raw);
      return wrapped ? decodeURIComponent(wrapped[1]) : raw;
    })
    .join(" ");

describe("ClipPlayer", () => {
  // Twelve iframes at page load would each pull their own player bundle, in a
  // section the visitor may never scroll to. The facade is the whole point.
  it("renders no iframe before playback starts", () => {
    const html = renderToStaticMarkup(
      <ClipPlayer video={video} isPlaying={false} onPlay={() => {}} />,
    );
    expect(html).not.toContain("<iframe");
    expect(imageSources(html)).toContain("https://i.ytimg.com/vi/abc123/maxresdefault.jpg");
  });

  it("renders the embed once playing, and drops the facade image", () => {
    const html = renderToStaticMarkup(
      <ClipPlayer video={video} isPlaying onPlay={() => {}} />,
    );
    expect(html).toContain("<iframe");
    expect(html).toContain("https://www.youtube-nocookie.com/embed/abc123?autoplay=1&amp;rel=0");
    expect(imageSources(html)).not.toContain("maxresdefault.jpg");
  });

  it("names the clip on the play control, not just visually", () => {
    const html = renderToStaticMarkup(
      <ClipPlayer video={video} isPlaying={false} onPlay={() => {}} />,
    );
    expect(html).toContain('aria-label="Play Insane 1v4 clutch"');
  });

  it("shows the title and metadata", () => {
    const html = renderToStaticMarkup(
      <ClipPlayer video={video} isPlaying={false} onPlay={() => {}} />,
    );
    expect(html).toContain("Insane 1v4 clutch");
    expect(html).toContain("12,400");
  });
});
