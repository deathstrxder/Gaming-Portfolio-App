import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TrafficChart } from "@/components/site/admin/TrafficChart";
import { niceAxisTop } from "@/components/site/admin/scale";

const HOUR = 3600;
const START = 1_786_000_000;

const series = (counts: number[]) =>
  counts.map((n, i) => ({ startSec: START + i * HOUR, n }));

const countOf = (html: string, needle: string) => html.split(needle).length - 1;

describe("niceAxisTop", () => {
  it("always leaves room for the peak", () => {
    for (const n of [1, 3, 7, 9, 11, 49, 51, 93, 99, 101, 117, 999, 1001, 12345]) {
      expect(niceAxisTop(n, 4)).toBeGreaterThanOrEqual(n);
    }
  });

  // Rounding the MAXIMUM up to a power of ten wastes most of the plot when a
  // value sits just above one: 117 becomes 200, squashing the series into the
  // bottom half. Choosing the tick step instead keeps the shape readable.
  it("does not waste half the plot on a value just above a round number", () => {
    expect(niceAxisTop(117, 4)).toBe(120);
    expect(niceAxisTop(93, 4)).toBe(100);
    expect(niceAxisTop(1100, 4)).toBe(1200);
  });

  it("divides evenly into whole-number ticks", () => {
    for (const n of [1, 7, 23, 93, 117, 260, 1001]) {
      const top = niceAxisTop(n, 4);
      expect(top % 4).toBe(0);
      expect(Number.isInteger(top / 4)).toBe(true);
    }
  });

  // Page views are counts, so a gridline at 0.25 would label a view that
  // cannot exist.
  it("never steps in fractions, however small the series", () => {
    expect(niceAxisTop(1, 4)).toBe(4);
    expect(niceAxisTop(2, 4)).toBe(4);
    expect(niceAxisTop(0, 4)).toBe(4);
  });
});

describe("TrafficChart", () => {
  it("plots one point per bucket", () => {
    const html = renderToStaticMarkup(<TrafficChart points={series([1, 5, 3, 9])} bucketSec={HOUR} />);
    // Match the whole tag then pull `d` out of it — attribute order is React's
    // to choose, not something this test should depend on.
    const tag = /<path[^>]*data-testid="traffic-area"[^>]*>/.exec(html);
    expect(tag).not.toBeNull();
    const d = / d="([^"]+)"/.exec(tag![0]);
    expect(d).not.toBeNull();

    // One L per point after the initial M, plus the two baseline corners.
    expect(countOf(d![1], "L")).toBe(5);
  });

  it("starts the y axis at zero", () => {
    const html = renderToStaticMarkup(<TrafficChart points={series([40, 50])} bucketSec={HOUR} />);
    expect(html).toContain(">0<");
  });

  // A flat line at zero is indistinguishable from real zero traffic, so an empty
  // range says so in words instead.
  it("says so when the range holds no views at all", () => {
    const html = renderToStaticMarkup(<TrafficChart points={series([0, 0, 0])} bucketSec={HOUR} />);
    expect(html).toContain("No page views in this range");
  });

  it("still renders the axes when the range is empty", () => {
    const html = renderToStaticMarkup(<TrafficChart points={[]} bucketSec={HOUR} />);
    expect(html).toContain("No page views in this range");
    expect(html).toContain("<svg");
  });

  // The tooltip is an enhancement; every value stays reachable without a pointer.
  it("lists every bucket in a table for readers without a pointer", () => {
    const html = renderToStaticMarkup(<TrafficChart points={series([1, 5, 3, 9])} bucketSec={HOUR} />);

    expect(countOf(html, "<tr")).toBe(5); // header + 4 buckets
    expect(html).toContain("<th");
    for (const n of ["1", "5", "3", "9"]) expect(html).toContain(`<td>${n}</td>`);
  });

  it("keeps the stroke width fixed as the chart scales", () => {
    const html = renderToStaticMarkup(<TrafficChart points={series([1, 2])} bucketSec={HOUR} />);
    expect(html).toContain('vector-effect="non-scaling-stroke"');
  });

  it("exposes the plot to the keyboard", () => {
    const html = renderToStaticMarkup(<TrafficChart points={series([1, 2])} bucketSec={HOUR} />);
    expect(html).toContain('tabindex="0"');
  });
});
