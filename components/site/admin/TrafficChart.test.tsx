import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TrafficChart } from "@/components/site/admin/TrafficChart";
import { niceCeil } from "@/components/site/admin/scale";

const HOUR = 3600;
const START = 1_786_000_000;

const series = (counts: number[]) =>
  counts.map((n, i) => ({ startSec: START + i * HOUR, n }));

const countOf = (html: string, needle: string) => html.split(needle).length - 1;

describe("niceCeil", () => {
  // A y-axis topped at the raw maximum puts the peak on the frame edge and gives
  // the reader no round number to measure against.
  it("rounds up to a 1/2/5 x 10^k step", () => {
    expect(niceCeil(7)).toBe(10);
    expect(niceCeil(23)).toBe(50);
    expect(niceCeil(120)).toBe(200);
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(0)).toBe(1);
  });

  it("never returns less than the value it is given", () => {
    for (const n of [1, 3, 9, 11, 49, 51, 99, 101, 999, 1001, 12345]) {
      expect(niceCeil(n)).toBeGreaterThanOrEqual(n);
    }
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
