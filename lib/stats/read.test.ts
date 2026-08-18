import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, it, expect, vi, afterEach } from "vitest";
import { getLiveStats } from "./read";

const validRemote = {
  version: 1,
  generatedAt: "2026-07-24T18:00:00.000Z",
  providers: {
    youtube: {
      ok: true,
      stale: false,
      fetchedAt: "2026-07-24T18:00:00.000Z",
      data: { subscribers: 1240, subscribersAreRounded: true, videos: [] },
    },
  },
};

/**
 * What is actually published on the stats-data branch right now.
 *
 * The Hypixel provider was removed after its API application was denied, but
 * the live snapshot keeps its `hypixel` block until the workflow next rewrites
 * it. If the schema rejected unknown keys, deploying that removal would take
 * the clips carousel down on the very next fetch — so this pins that the block
 * is ignored rather than fatal.
 */
const remoteWithRetiredProvider = {
  ...validRemote,
  providers: {
    ...validRemote.providers,
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
    expect(stats.providers.youtube?.data?.subscribers).toBe(1240);
  });

  it("still reads a published snapshot that carries the retired hypixel block", async () => {
    mockFetch(() => new Response(JSON.stringify(remoteWithRetiredProvider), { status: 200 }));
    const stats = await getLiveStats();

    // The unknown block is dropped, and the provider that still matters survives.
    expect(stats.providers.youtube?.data?.subscribers).toBe(1240);
    expect("hypixel" in stats.providers).toBe(false);
  });

  it("falls back to the bundled seed on a non-200 response", async () => {
    mockFetch(() => new Response("not found", { status: 404 }));
    const stats = await getLiveStats();
    expect(stats.providers.youtube).toBeUndefined();
    expect(stats.version).toBe(1);
  });

  it("falls back to the bundled seed when the fetch throws", async () => {
    mockFetch(() => {
      throw new Error("network down");
    });
    const stats = await getLiveStats();
    expect(stats.version).toBe(1);
    expect(stats.providers.youtube).toBeUndefined();
  });

  it("falls back to the bundled seed when the body is not valid JSON", async () => {
    mockFetch(() => new Response("<!doctype html>", { status: 200 }));
    const stats = await getLiveStats();
    expect(stats.version).toBe(1);
    expect(stats.providers.youtube).toBeUndefined();
  });

  it("falls back to the bundled seed when the payload fails schema validation", async () => {
    mockFetch(() => new Response(JSON.stringify({ version: 99 }), { status: 200 }));
    const stats = await getLiveStats();
    expect(stats.version).toBe(1);
    expect(stats.providers.youtube).toBeUndefined();
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

    expect(stats.providers.youtube?.data?.subscribers).toBe(1240);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to the bundled seed when the path does not exist", async () => {
    process.env.STATS_SNAPSHOT_FILE = path.join(tmpdir(), "definitely-not-here.json");
    const stats = await getLiveStats();
    expect(stats.version).toBe(1);
    expect(stats.providers.youtube).toBeUndefined();
  });
});
