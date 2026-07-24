import type { BridgeStats, HypixelData, SkyblockStats } from "@/lib/stats/types";

/**
 * The Hypixel Duels title ladder for Bridge, lowest first.
 *
 * Hypixel does not expose the division as a queryable field, so it is derived
 * from the cumulative win count. Step 7 of this task verifies the thresholds
 * against a known-good account before the values are trusted.
 */
export const BRIDGE_TITLES: { title: string; minWins: number }[] = [
  { title: "Rookie", minWins: 0 },
  { title: "Iron", minWins: 100 },
  { title: "Gold", minWins: 200 },
  { title: "Diamond", minWins: 400 },
  { title: "Master", minWins: 800 },
  { title: "Legend", minWins: 1500 },
  { title: "Grandmaster", minWins: 1800 },
  { title: "Godlike", minWins: 5000 },
  { title: "Celestial", minWins: 10000 },
];

/**
 * Bridge is split across several Duels modes (1v1, doubles, fours, and so on),
 * each with its own win/loss key, so the headline figure is their sum.
 */
export function sumByPattern(source: Record<string, unknown>, pattern: RegExp): number {
  return Object.entries(source).reduce((total, [key, value]) => {
    if (!pattern.test(key)) return total;
    return typeof value === "number" ? total + value : total;
  }, 0);
}

export function deriveBridgeTitle(wins: number): string {
  let result = BRIDGE_TITLES[0].title;
  for (const tier of BRIDGE_TITLES) {
    if (wins >= tier.minWins) result = tier.title;
  }
  return result;
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

/** Mojang's public username-to-UUID endpoint needs no API key. */
async function resolveUuid(username: string): Promise<string> {
  const body = (await getJson(
    `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
  )) as { id?: string };
  if (!body.id) throw new Error(`no Minecraft profile for "${username}"`);
  return body.id;
}

function buildBridgeStats(duels: Record<string, unknown>): BridgeStats {
  const wins = sumByPattern(duels, /^bridge_.*_wins$/);
  const losses = sumByPattern(duels, /^bridge_.*_losses$/);
  const bestWinstreak =
    typeof duels.best_bridge_winstreak === "number" ? duels.best_bridge_winstreak : 0;

  return {
    title: deriveBridgeTitle(wins),
    wins,
    losses,
    // Guard the divide so a fresh account with zero losses does not produce Infinity.
    wlr: losses === 0 ? wins : Number((wins / losses).toFixed(2)),
    bestWinstreak,
  };
}

/**
 * Networth is not an API field — it is computed from inventory NBT plus live
 * auction and bazaar prices. This is the flakiest step in the whole pipeline,
 * so the caller treats a throw here as "skip Skyblock", not "Hypixel failed".
 */
async function buildSkyblockStats(apiKey: string, uuid: string): Promise<SkyblockStats> {
  const { ProfileNetworthCalculator } = await import("skyhelper-networth");

  const profilesBody = (await getJson(
    `https://api.hypixel.net/v2/skyblock/profiles?uuid=${uuid}`,
    { "API-Key": apiKey },
  )) as {
    profiles?: {
      profile_id: string;
      cute_name: string;
      selected: boolean;
      // The skyhelper-networth constructor requires `object`, not `unknown`.
      members: Record<string, object>;
      banking?: { balance?: number };
    }[];
  };

  const profile = profilesBody.profiles?.find((p) => p.selected);
  if (!profile) throw new Error("no selected Skyblock profile");

  const museumBody = (await getJson(
    `https://api.hypixel.net/v2/skyblock/museum?profile=${profile.profile_id}`,
    { "API-Key": apiKey },
  ).catch(() => ({}))) as { members?: Record<string, object> };

  const calculator = new ProfileNetworthCalculator(
    profile.members[uuid],
    museumBody.members?.[uuid] ?? {},
    profile.banking?.balance ?? 0,
  );
  const result = await calculator.getNetworth();

  return { networth: Math.round(result.networth), profileName: profile.cute_name };
}

export async function fetchHypixel(opts: {
  apiKey: string;
  username: string;
}): Promise<HypixelData> {
  const uuid = await resolveUuid(opts.username);

  const playerBody = (await getJson(`https://api.hypixel.net/v2/player?uuid=${uuid}`, {
    "API-Key": opts.apiKey,
  })) as { player?: { stats?: { Duels?: Record<string, unknown> } } };

  const duels = playerBody.player?.stats?.Duels;
  if (!duels) throw new Error("no Duels stats on the Hypixel player payload");

  const data: HypixelData = { bridge: buildBridgeStats(duels) };

  try {
    data.skyblock = await buildSkyblockStats(opts.apiKey, uuid);
  } catch (error) {
    // Deliberate: Bridge stats still publish when networth computation fails.
    console.warn("[hypixel] skyblock networth skipped:", (error as Error).message);
  }

  return data;
}
