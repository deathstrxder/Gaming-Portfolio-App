import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";

import { snapshotSchema } from "@/lib/stats/schema";
import { composeSnapshot } from "@/lib/stats/merge";
import { fetchYouTube } from "@/lib/stats/providers/youtube";
import type { Snapshot, YouTubeData } from "@/lib/stats/types";

const OUTPUT = path.join(process.cwd(), "data", "stats.json");

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing required environment variable ${name}`);
  return value;
}

/** Turns a provider call into a merge outcome, logging rather than throwing. */
async function attempt<T>(
  label: string,
  run: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[${label}] failed:`, reason);
    return { ok: false };
  }
}

async function readPrevious(): Promise<Snapshot> {
  let raw: string;
  try {
    raw = await readFile(OUTPUT, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn("[build-stats] no existing snapshot; starting fresh");
      return { version: 1, generatedAt: new Date(0).toISOString(), providers: {} };
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corruption, not a first run. Starting fresh here would silently discard
    // history the moment any provider also failed, so refuse to continue.
    throw new Error(`existing snapshot at ${OUTPUT} is not valid JSON; refusing to overwrite it`);
  }

  const result = snapshotSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`existing snapshot at ${OUTPUT} failed schema validation; refusing to overwrite it`);
  }
  return result.data as Snapshot;
}

async function main() {
  const previous = await readPrevious();
  const nowIso = new Date().toISOString();

  // YouTube is the only provider now. A Hypixel one lived alongside it until the
  // API application was denied; Promise.all and the multi-provider failure check
  // are kept in shape rather than collapsed, because the composeSnapshot
  // carry-forward they exist to serve is the same for one provider or three.
  const [youtubeOutcome] = await Promise.all([
    attempt<YouTubeData>("youtube", () =>
      fetchYouTube({
        apiKey: required("YOUTUBE_API_KEY"),
        handle: required("YOUTUBE_HANDLE"),
        // The carousel shows one clip at a time, so the old four-item default
        // would make the dot row and the counter pointless almost immediately.
        limit: 12,
      }),
    ),
  ]);

  if (!youtubeOutcome.ok) {
    // Every provider failed. Writing nothing leaves the last good snapshot in
    // place; exiting clean keeps the scheduled job from going red on a blip.
    console.error("[build-stats] all providers failed; leaving the snapshot untouched");
    return;
  }

  const next: Snapshot = composeSnapshot(previous, { youtube: youtubeOutcome }, nowIso);

  const validated = snapshotSchema.safeParse(next);
  if (!validated.success) {
    console.error("[build-stats] built an invalid snapshot; refusing to write");
    console.error(JSON.stringify(validated.error.issues, null, 2));
    process.exitCode = 1;
    return;
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  const tmp = `${OUTPUT}.tmp`;
  await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(tmp, OUTPUT);
  console.log(`[build-stats] wrote ${OUTPUT} at ${nowIso}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
