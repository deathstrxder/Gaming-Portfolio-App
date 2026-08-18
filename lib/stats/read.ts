import { readFile } from "node:fs/promises";

import seed from "@/data/stats.json";
import { snapshotSchema } from "./schema";
import type { Snapshot } from "./types";

/**
 * The snapshot lives on an orphan `stats-data` branch that Render does not
 * watch, so the 6-hourly refresh commits never trigger a redeploy.
 */
export const SNAPSHOT_URL =
  "https://raw.githubusercontent.com/deathstrxder/Gaming-Portfolio-App/stats-data/data/stats.json";

/**
 * Last-resort snapshot if the bundled seed ever drifts from the schema.
 * Hardcoded rather than derived, so this module cannot throw at import time.
 */
const EMPTY_SNAPSHOT: Snapshot = {
  version: 1,
  generatedAt: "1970-01-01T00:00:00.000Z",
  providers: {},
};

/** The bundled seed is the guaranteed floor — the page always has real numbers. */
const seedResult = snapshotSchema.safeParse(seed);
const fallback: Snapshot = seedResult.success ? (seedResult.data as Snapshot) : EMPTY_SNAPSHOT;

/**
 * Where the snapshot comes from.
 *
 * `STATS_SNAPSHOT_FILE` reads a local file instead of fetching. The bundled seed
 * carries no providers, so without an override there is nothing for the E2E suite
 * to assert against and no way to develop the clips section without a YouTube API
 * key. A local path, rather than a fixture served from `public/`, keeps the
 * override server-side and ships nothing to production.
 *
 * This module is imported only by server components (ClipsSection), so the
 * `node:fs` dependency never reaches the client bundle.
 */
async function readSnapshotSource(): Promise<unknown> {
  const localPath = process.env.STATS_SNAPSHOT_FILE;
  if (localPath) return JSON.parse(await readFile(localPath, "utf8"));

  const response = await fetch(SNAPSHOT_URL, { next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`snapshot responded ${response.status}`);
  return response.json();
}

/**
 * Reads the published snapshot, preferring fresh remote data and falling back to
 * the bundled seed on any failure. Never throws: a visitor sees older numbers,
 * never a spinner or an error.
 */
export async function getLiveStats(): Promise<Snapshot> {
  try {
    const parsed = snapshotSchema.safeParse(await readSnapshotSource());
    return parsed.success ? (parsed.data as Snapshot) : fallback;
  } catch {
    return fallback;
  }
}
