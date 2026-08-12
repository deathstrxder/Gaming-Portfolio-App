import { describe, expect, it } from "vitest";

import { clampIndex, stepIndex } from "@/lib/clips/carousel";

describe("stepIndex", () => {
  it("advances within range", () => {
    expect(stepIndex(0, 1, 12)).toBe(1);
    expect(stepIndex(5, -1, 12)).toBe(4);
  });

  it("wraps forward off the end and backward off the start", () => {
    expect(stepIndex(11, 1, 12)).toBe(0);
    expect(stepIndex(0, -1, 12)).toBe(11);
  });

  // A one-clip carousel renders no arrows, but the maths must not depend on that.
  it("treats a single clip as a fixed point in both directions", () => {
    expect(stepIndex(0, 1, 1)).toBe(0);
    expect(stepIndex(0, -1, 1)).toBe(0);
  });

  // JS `%` returns NaN for a zero modulus, which would render as "NaN / 00".
  it("returns 0 for an empty list rather than NaN or a negative index", () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
    expect(stepIndex(0, -1, 0)).toBe(0);
  });
});

describe("clampIndex", () => {
  it("clamps to the last index and to zero", () => {
    expect(clampIndex(5, 3)).toBe(2);
    expect(clampIndex(-4, 3)).toBe(0);
  });

  it("passes an in-range target through", () => {
    expect(clampIndex(1, 3)).toBe(1);
  });

  it("returns 0 for an empty list", () => {
    expect(clampIndex(1, 0)).toBe(0);
  });
});
