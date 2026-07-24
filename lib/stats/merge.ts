import type { ProviderResult } from "./types";

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
