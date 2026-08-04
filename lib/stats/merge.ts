import type { HypixelData, ProviderResult, Snapshot, YouTubeData } from "./types";

/**
 * Folds one provider's outcome into the snapshot.
 *
 * A failed fetch never destroys good data: the previous block is carried over
 * with its original `fetchedAt` so the UI can report honestly how old it is,
 * and `stale` is flipped so the badge renders as cached rather than live.
 */
export function mergeProvider<T>(
  previous: ProviderResult<T> | undefined,
  outcome: { ok: true; data: T } | { ok: false },
  nowIso: string,
): ProviderResult<T> | undefined {
  if (outcome.ok) {
    return { ok: true, stale: false, fetchedAt: nowIso, data: outcome.data };
  }
  if (!previous?.data) return undefined;
  return { ...previous, stale: true };
}

/**
 * Builds the next snapshot from the previous one plus this run's outcomes.
 * Pure — no clock, no network, no filesystem — so the mixed-outcome case that
 * matters most (one provider fresh, one carried forward stale) is testable.
 */
export function composeSnapshot(
  previous: Snapshot,
  outcomes: {
    hypixel: { ok: true; data: HypixelData } | { ok: false };
    youtube: { ok: true; data: YouTubeData } | { ok: false };
  },
  nowIso: string,
): Snapshot {
  return {
    version: 1,
    generatedAt: nowIso,
    providers: {
      hypixel: mergeProvider(previous.providers.hypixel, outcomes.hypixel, nowIso),
      youtube: mergeProvider(previous.providers.youtube, outcomes.youtube, nowIso),
    },
  };
}
