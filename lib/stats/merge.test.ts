import { describe, it, expect } from "vitest";
import { mergeProvider, composeSnapshot } from "./merge";

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

describe("composeSnapshot", () => {
  const previous = {
    version: 1 as const,
    generatedAt: EARLIER,
    providers: {
      hypixel: { ok: true, stale: false, fetchedAt: EARLIER, data: { bridge: { title: "Grandmaster", wins: 1847, losses: 612, wlr: 3.02, bestWinstreak: 53 } } },
      youtube: { ok: true, stale: false, fetchedAt: EARLIER, data: { subscribers: 1000, subscribersAreRounded: true, videos: [] } },
    },
  };

  it("keeps the failing provider's previous data stale while writing the other fresh", () => {
    const next = composeSnapshot(
      previous,
      {
        hypixel: { ok: false },
        youtube: { ok: true, data: { subscribers: 1240, subscribersAreRounded: true, videos: [] } },
      },
      NOW,
    );

    expect(next.generatedAt).toBe(NOW);
    expect(next.providers.hypixel).toEqual({ ...previous.providers.hypixel, stale: true });
    expect(next.providers.hypixel?.fetchedAt).toBe(EARLIER);
    expect(next.providers.youtube?.stale).toBe(false);
    expect(next.providers.youtube?.fetchedAt).toBe(NOW);
    expect(next.providers.youtube?.data?.subscribers).toBe(1240);
  });

  it("advances generatedAt even when a provider is carried forward stale", () => {
    const next = composeSnapshot(previous, { hypixel: { ok: false }, youtube: { ok: false } }, NOW);
    expect(next.generatedAt).toBe(NOW);
    expect(next.providers.hypixel?.stale).toBe(true);
    expect(next.providers.youtube?.stale).toBe(true);
  });
});
