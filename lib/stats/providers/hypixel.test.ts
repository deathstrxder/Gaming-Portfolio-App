import { describe, it, expect } from "vitest";
import { deriveBridgeTitle, sumByPattern, BRIDGE_TITLES } from "./hypixel";

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
