import { describe, it, expect } from "vitest";
import { mergeProvider } from "./merge";

const NOW = "2026-07-24T18:00:00.000Z";
const EARLIER = "2026-07-24T12:00:00.000Z";

type Payload = { value: number };

describe("mergeProvider", () => {
  it("stores fresh data as ok and not stale", () => {
    const result = mergeProvider<Payload>(undefined, { ok: true, data: { value: 1 } }, NOW);
    expect(result).toEqual({ ok: true, stale: false, fetchedAt: NOW, data: { value: 1 } });
  });

  it("overwrites previous data on a successful fetch", () => {
    const previous = { ok: true, stale: false, fetchedAt: EARLIER, data: { value: 1 } };
    const result = mergeProvider<Payload>(previous, { ok: true, data: { value: 2 } }, NOW);
    expect(result?.data).toEqual({ value: 2 });
    expect(result?.fetchedAt).toBe(NOW);
  });

  it("keeps previous data and its original fetchedAt when a fetch fails", () => {
    const previous = { ok: true, stale: false, fetchedAt: EARLIER, data: { value: 1 } };
    const result = mergeProvider<Payload>(previous, { ok: false }, NOW);
    expect(result).toEqual({ ok: true, stale: true, fetchedAt: EARLIER, data: { value: 1 } });
  });

  it("returns undefined when a fetch fails and there is nothing to preserve", () => {
    expect(mergeProvider<Payload>(undefined, { ok: false }, NOW)).toBeUndefined();
  });

  it("keeps a previously stale block stale when the fetch fails again", () => {
    const previous = { ok: true, stale: true, fetchedAt: EARLIER, data: { value: 1 } };
    const result = mergeProvider<Payload>(previous, { ok: false }, NOW);
    expect(result?.stale).toBe(true);
    expect(result?.fetchedAt).toBe(EARLIER);
  });
});
