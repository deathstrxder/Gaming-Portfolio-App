import { existsSync } from "node:fs";
import { describe, it, expect } from "vitest";

import { GAMES } from "@/lib/games";

const TWO_ICON_GAMES = [
  "clash-of-clans",
  "clash-royale",
  "brawl-stars",
  "minecraft",
  "fortnite",
] as const;

describe("game icon data", () => {
  it("gives the five repeated games a distinct alternate icon", () => {
    for (const id of TWO_ICON_GAMES) {
      const game = GAMES[id];
      expect(game.iconAlt, `${id} needs iconAlt`).toBeTruthy();
      expect(game.iconAlt).not.toBe(game.icon);
    }
  });

  it("points every icon and iconAlt at a file that exists in public/", () => {
    for (const id of TWO_ICON_GAMES) {
      const game = GAMES[id];
      for (const src of [game.icon, game.iconAlt!]) {
        expect(existsSync(`public${src}`), `${src} missing`).toBe(true);
      }
    }
  });
});
