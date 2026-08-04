import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchHypixel, deriveBridgeTitle, sumByPattern, BRIDGE_TITLES } from "./hypixel";

const { networthMock } = vi.hoisted(() => ({ networthMock: vi.fn() }));

vi.mock("skyhelper-networth", () => ({
  ProfileNetworthCalculator: class {
    async getNetworth() {
      return networthMock();
    }
  },
}));

describe("sumByPattern", () => {
  const duels = {
    bridge_duel_wins: 900,
    bridge_doubles_wins: 700,
    bridge_four_wins: 247,
    bridge_duel_losses: 400,
    bridge_doubles_losses: 212,
    current_winstreak: 7,
    wins: 99999,
  };

  it("sums only the keys matching the pattern", () => {
    expect(sumByPattern(duels, /^bridge_.*_wins$/)).toBe(1847);
    expect(sumByPattern(duels, /^bridge_.*_losses$/)).toBe(612);
  });

  it("ignores non-numeric and absent values", () => {
    expect(sumByPattern({ bridge_a_wins: "ten", bridge_b_wins: 5 }, /^bridge_.*_wins$/)).toBe(5);
    expect(sumByPattern({}, /^bridge_.*_wins$/)).toBe(0);
  });
});

describe("deriveBridgeTitle", () => {
  it("returns the highest title whose threshold the win count meets", () => {
    expect(deriveBridgeTitle(1847)).toBe("Grandmaster");
  });

  it("returns the lowest title at zero wins", () => {
    expect(deriveBridgeTitle(0)).toBe(BRIDGE_TITLES[0].title);
  });

  it("is inclusive at an exact threshold boundary", () => {
    const grandmaster = BRIDGE_TITLES.find((t) => t.title === "Grandmaster");
    expect(grandmaster).toBeDefined();
    expect(deriveBridgeTitle(grandmaster!.minWins)).toBe("Grandmaster");
    expect(deriveBridgeTitle(grandmaster!.minWins - 1)).not.toBe("Grandmaster");
  });

  it("returns the top title for an extreme win count", () => {
    const top = BRIDGE_TITLES[BRIDGE_TITLES.length - 1];
    expect(deriveBridgeTitle(1_000_000)).toBe(top.title);
  });
});

const UUID = "uuid123";

function routeFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("api.mojang.com")) {
        return new Response(JSON.stringify({ id: UUID }));
      }
      if (url.includes("/v2/player")) {
        return new Response(
          JSON.stringify({
            player: {
              stats: {
                Duels: {
                  bridge_duel_wins: 900,
                  bridge_doubles_wins: 947,
                  bridge_duel_losses: 612,
                  best_bridge_winstreak: 53,
                },
              },
            },
          }),
        );
      }
      if (url.includes("/v2/skyblock/profiles")) {
        return new Response(
          JSON.stringify({
            profiles: [
              {
                profile_id: "p1",
                cute_name: "Mango",
                selected: true,
                members: { [UUID]: {} },
                banking: { balance: 100 },
              },
            ],
          }),
        );
      }
      if (url.includes("/v2/skyblock/museum")) {
        return new Response(JSON.stringify({ members: { [UUID]: {} } }));
      }
      throw new Error(`unexpected url ${url}`);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  networthMock.mockReset();
});

describe("fetchHypixel", () => {
  it("returns bridge stats derived from the summed duels keys", async () => {
    routeFetch();
    networthMock.mockResolvedValue({ networth: 4210000000 });

    const data = await fetchHypixel({ apiKey: "k", username: "someone" });

    expect(data.bridge).toEqual({
      title: "Grandmaster",
      wins: 1847,
      losses: 612,
      wlr: 3.02,
      bestWinstreak: 53,
    });
  });

  it("includes skyblock stats when the networth calculation succeeds", async () => {
    routeFetch();
    networthMock.mockResolvedValue({ networth: 4210000000 });

    const data = await fetchHypixel({ apiKey: "k", username: "someone" });

    expect(data.skyblock).toEqual({ networth: 4210000000, profileName: "Mango" });
  });

  it("still returns bridge stats when the networth calculation throws", async () => {
    // The isolation contract: networth depends on live market data and is the
    // flakiest step in the pipeline, so its failure must not take Bridge down.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    routeFetch();
    networthMock.mockRejectedValue(new Error("market data unavailable"));

    const data = await fetchHypixel({ apiKey: "k", username: "someone" });

    expect(data.bridge.wins).toBe(1847);
    expect(data.skyblock).toBeUndefined();
    warn.mockRestore();
  });

  it("propagates a failure to fetch the player, since bridge stats are required", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("api.mojang.com")) return new Response(JSON.stringify({ id: UUID }));
        return new Response("upstream error", { status: 500 });
      }),
    );

    await expect(fetchHypixel({ apiKey: "k", username: "someone" })).rejects.toThrow();
  });
});
