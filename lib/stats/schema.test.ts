import { describe, it, expect } from "vitest";
import { snapshotSchema } from "./schema";
import seed from "@/data/stats.json";

const fullSnapshot = {
  version: 1,
  generatedAt: "2026-07-24T18:00:00.000Z",
  providers: {
    hypixel: {
      ok: true,
      stale: false,
      fetchedAt: "2026-07-24T18:00:00.000Z",
      data: {
        skyblock: { networth: 4210000000, profileName: "Mango" },
        bridge: { title: "Grandmaster", wins: 1847, losses: 612, wlr: 3.02, bestWinstreak: 53 },
      },
    },
    youtube: {
      ok: true,
      stale: false,
      fetchedAt: "2026-07-24T18:00:00.000Z",
      data: {
        subscribers: 1240,
        subscribersAreRounded: true,
        videos: [
          {
            id: "abc123",
            title: "Bridge 50 winstreak",
            thumbnail: "https://i.ytimg.com/vi/abc123/mqdefault.jpg",
            views: 3021,
            publishedAt: "2026-07-20T00:00:00.000Z",
          },
        ],
      },
    },
  },
};

describe("snapshotSchema", () => {
  it("accepts a full snapshot", () => {
    expect(snapshotSchema.safeParse(fullSnapshot).success).toBe(true);
  });

  it("accepts a snapshot where one provider failed and has no data", () => {
    const partial = {
      ...fullSnapshot,
      providers: {
        ...fullSnapshot.providers,
        hypixel: { ok: false, stale: true, fetchedAt: "2026-07-23T18:00:00.000Z" },
      },
    };
    expect(snapshotSchema.safeParse(partial).success).toBe(true);
  });

  it("accepts a snapshot with no providers at all", () => {
    const empty = { version: 1, generatedAt: "2026-07-24T18:00:00.000Z", providers: {} };
    expect(snapshotSchema.safeParse(empty).success).toBe(true);
  });

  it("rejects a snapshot missing generatedAt", () => {
    const { generatedAt: _omitted, ...bad } = fullSnapshot;
    expect(snapshotSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a bridge block with a non-numeric wins value", () => {
    const bad = structuredClone(fullSnapshot);
    // @ts-expect-error deliberately invalid for the test
    bad.providers.hypixel.data.bridge.wins = "lots";
    expect(snapshotSchema.safeParse(bad).success).toBe(false);
  });

  it("validates the committed seed file against the current schema", () => {
    const result = snapshotSchema.safeParse(seed);
    expect(result.success).toBe(true);
  });
});
