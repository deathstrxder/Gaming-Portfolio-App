import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, it, expect, vi, afterEach } from "vitest";
import { getLiveStats } from "./read";

const validRemote = {
  version: 1,
  generatedAt: "2026-07-24T18:00:00.000Z",
  providers: {
    hypixel: {
      ok: true,
      stale: false,
      fetchedAt: "2026-07-24T18:00:00.000Z",
      data: {
        bridge: { title: "Grandmaster", wins: 1847, losses: 612, wlr: 3.02, bestWinstreak: 53 },
      },
    },
  },
};

function mockFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getLiveStats", () => {
  it("returns the remote snapshot when it is valid", async () => {
    mockFetch(() => new Response(JSON.stringify(validRemote), { status: 200 }));
    const stats = await getLiveStats();
    expect(stats.providers.hypixel?.data?.bridge.wins).toBe(1847);
  });

  it("falls back to the bundled seed on a non-200 response", async () => {
    mockFetch(() => new Response("not found", { status: 404 }));
    const stats = await getLiveStats();
    expect(stats.providers.hypixel).toBeUndefined();
    expect(stats.version).toBe(1);
  });

  it("falls back to the bundled seed when the fetch throws", async () => {
    mockFetch(() => {
      throw new Error("network down");
    });
    const stats = await getLiveStats();
    expect(stats.version).toBe(1);
    expect(stats.providers.hypixel).toBeUndefined();
  });

  it("falls back to the bundled seed when the body is not valid JSON", async () => {
    mockFetch(() => new Response("<!doctype html>", { status: 200 }));
    const stats = await getLiveStats();
    expect(stats.version).toBe(1);
    expect(stats.providers.hypixel).toBeUndefined();
  });

  it("falls back to the bundled seed when the payload fails schema validation", async () => {
    mockFetch(() => new Response(JSON.stringify({ version: 99 }), { status: 200 }));
    const stats = await getLiveStats();
    expect(stats.version).toBe(1);
    expect(stats.providers.hypixel).toBeUndefined();
  });
});

/**
 * The bundled seed carries no providers, so without a local override there is
 * nothing for the E2E suite to drive and no way to develop the clips section
 * without a YouTube API key.
 */
describe("getLiveStats with STATS_SNAPSHOT_FILE", () => {
  afterEach(() => {
    delete process.env.STATS_SNAPSHOT_FILE;
  });

  it("reads the local file and never touches the network", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "clips-"));
    const file = path.join(dir, "snapshot.json");
    await writeFile(file, JSON.stringify(validRemote), "utf8");

    const fetchSpy = vi.fn(() => {
      throw new Error("fetch must not be called when STATS_SNAPSHOT_FILE is set");
    });
    vi.stubGlobal("fetch", fetchSpy);
    process.env.STATS_SNAPSHOT_FILE = file;

    const stats = await getLiveStats();

    expect(stats.providers.hypixel?.data?.bridge.wins).toBe(1847);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to the bundled seed when the path does not exist", async () => {
    process.env.STATS_SNAPSHOT_FILE = path.join(tmpdir(), "definitely-not-here.json");
    const stats = await getLiveStats();
    expect(stats.version).toBe(1);
    expect(stats.providers.hypixel).toBeUndefined();
  });
});
