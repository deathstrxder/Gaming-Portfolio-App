import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClipsCarousel } from "@/components/site/ClipsCarousel";
import type { YouTubeVideo } from "@/lib/stats/types";

const makeVideos = (count: number): YouTubeVideo[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `id${i}`,
    title: `Clip ${i}`,
    thumbnail: `https://i.ytimg.com/vi/id${i}/maxresdefault.jpg`,
    views: 100 * i,
    publishedAt: "2026-08-07T12:00:00.000Z",
  }));

const countOf = (html: string, needle: string) => html.split(needle).length - 1;

describe("ClipsCarousel", () => {
  it("marks exactly one layer active and hides the rest", () => {
    const html = renderToStaticMarkup(<ClipsCarousel videos={makeVideos(12)} />);

    expect(countOf(html, 'data-testid="clip-layer"')).toBe(12);
    expect(countOf(html, 'data-active="true"')).toBe(1);
    expect(countOf(html, 'data-active="false"')).toBe(11);
  });

  // Hidden layers must leave the accessibility tree AND the tab order. Counting
  // the exact attribute, not the substring "inert", which appears in class names.
  it("makes every inactive layer inert and aria-hidden", () => {
    const html = renderToStaticMarkup(<ClipsCarousel videos={makeVideos(12)} />);

    expect(countOf(html, 'inert=""')).toBe(11);
    expect(countOf(html, 'aria-hidden="true" inert=""')).toBe(11);
  });

  it("starts on the first clip and reports it in the counter", () => {
    const html = renderToStaticMarkup(<ClipsCarousel videos={makeVideos(12)} />);
    // [\s\S] rather than the `s` flag: this tsconfig targets below ES2018.
    const counter = /data-testid="clip-counter"[^>]*>([\s\S]*?)<\/p>/.exec(html);

    expect(counter).not.toBeNull();
    const text = counter![1].replace(/<[^>]+>/g, "");
    expect(text).toContain("01");
    expect(text).toContain("12");
  });

  it("renders one dot per clip", () => {
    const html = renderToStaticMarkup(<ClipsCarousel videos={makeVideos(7)} />);
    expect(countOf(html, 'data-testid="clip-dot"')).toBe(7);
  });

  // Arrows, dots, and a "01 / 01" counter are all noise when there is nothing to
  // step to, and a wrap-around arrow that visibly does nothing reads as broken.
  it("drops every control when there is only one clip", () => {
    const html = renderToStaticMarkup(<ClipsCarousel videos={makeVideos(1)} />);

    expect(html).not.toContain('data-testid="clip-dot"');
    expect(html).not.toContain('data-testid="clip-prev"');
    expect(html).not.toContain('data-testid="clip-next"');
    expect(html).not.toContain('data-testid="clip-counter"');
    expect(countOf(html, 'data-testid="clip-layer"')).toBe(1);
    expect(countOf(html, 'data-active="true"')).toBe(1);
  });

  it("labels itself as a carousel for assistive technology", () => {
    const html = renderToStaticMarkup(<ClipsCarousel videos={makeVideos(3)} />);

    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="Latest clips"');
    expect(countOf(html, 'aria-roledescription="slide"')).toBe(3);
    expect(html).toContain('aria-label="Clip 1 of 3"');
    expect(html).toContain('aria-label="Clip 3 of 3"');
  });

  it("marks the active dot as current", () => {
    const html = renderToStaticMarkup(<ClipsCarousel videos={makeVideos(3)} />);
    expect(countOf(html, 'aria-current="true"')).toBe(1);
  });

  // Only the visible clip may be a play target; the stacked layers sit on top of
  // one another, so a hidden facade left clickable would swallow the real click.
  it("renders no iframe until a clip is played", () => {
    const html = renderToStaticMarkup(<ClipsCarousel videos={makeVideos(3)} />);
    expect(html).not.toContain("<iframe");
  });
});
