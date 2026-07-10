export type Game = {
  id: string;
  name: string;
  logo: string;
  splash: string;
  icon: string;
  bullets: string[];
  /** True when the logo art is dark and needs to be rendered white on the dark theme. */
  logoInvert?: boolean;
  /** CSS object-position for the splash background (defaults to center). */
  splashPosition?: string;
  /** Alternate icon for games that appear on two dodecahedron faces. */
  iconAlt?: string;
};

export const GAMES: Record<string, Game> = {
  "clash-of-clans": {
    id: "clash-of-clans",
    name: "Clash of Clans",
    logo: "/gaming/logos/clash-of-clans.png",
    splash: "/gaming/splash/clash-of-clans.jpg",
    icon: "/gaming/icons/clash-of-clans.png",
    iconAlt: "/gaming/icons/clash-of-clans-2.webp",
    splashPosition: "25% center",
    bullets: [
      "The first video game I have ever played",
      "6 accounts with Town Hall 13 on my main",
      "0 Money Spent",
    ],
  },
  "clash-royale": {
    id: "clash-royale",
    name: "Clash Royale",
    logo: "/gaming/logos/clash-royale.png",
    splash: "/gaming/splash/clash-royale.jpg",
    icon: "/gaming/icons/clash-royale.webp",
    iconAlt: "/gaming/icons/clash-royale-2.webp",
    bullets: [
      "Played on release but quickly quit for 3 years",
      "First account is missing",
      "Trophy Road sucks",
    ],
  },
  "brawl-stars": {
    id: "brawl-stars",
    name: "Brawl Stars",
    logo: "/gaming/logos/brawl-stars.png",
    splash: "/gaming/splash/brawl-stars.png",
    icon: "/gaming/icons/brawl-stars.png",
    iconAlt: "/gaming/icons/brawl-stars-2.webp",
    splashPosition: "35% center",
    bullets: [
      "Masters after the first ranked update",
      "I swear I could go pro if I tried",
    ],
  },
  "league-of-legends": {
    id: "league-of-legends",
    name: "League of Legends",
    logo: "/gaming/logos/league-of-legends.png",
    splash: "/gaming/splash/league-of-legends.jpg",
    icon: "/gaming/icons/league-of-legends.png",
    bullets: [
      "Ranked Platinum 2",
      "Lux main",
      "Play Midlane/Support",
      "My main game as of 2026",
    ],
  },
  valorant: {
    id: "valorant",
    name: "Valorant",
    logo: "/gaming/logos/valorant.png",
    splash: "/gaming/splash/valorant.jpg",
    icon: "/gaming/icons/valorant.jpg",
    bullets: [
      "Ranked Silver I but I have barely played ranked",
      "Swiftplay Demon",
      "Ascendent aim; gold gamesense",
    ],
  },
  minecraft: {
    id: "minecraft",
    name: "Minecraft",
    logo: "/gaming/logos/minecraft.png",
    splash: "/gaming/splash/minecraft.jpg",
    icon: "/gaming/icons/minecraft.svg",
    iconAlt: "/gaming/icons/minecraft-2.svg",
    bullets: [
      "Grandmaster in Hypixel Bridge",
      "World Record Holder of the 50 winstreak speedrun in Bridge",
      "4bil+ networth in Hypixel Skyblock",
    ],
  },
  fortnite: {
    id: "fortnite",
    name: "Fortnite",
    logo: "/gaming/logos/fortnite.png",
    splash: "/gaming/splash/fortnite.jpg",
    icon: "/gaming/icons/fortnite.svg",
    iconAlt: "/gaming/icons/fortnite-2.webp",
    logoInvert: true,
    bullets: [
      "Box Fight Demon",
      "This game is too sweaty",
      "I only enjoy building stuff alone (can quad edit)",
    ],
  },
};

/** The three game-showcase sections (2, 3, 4), each a row of game cards. */
export const SECTION_GROUPS: { id: string; games: Game[] }[] = [
  {
    id: "supercell",
    games: [GAMES["clash-of-clans"], GAMES["clash-royale"], GAMES["brawl-stars"]],
  },
  {
    id: "competitive",
    games: [GAMES["league-of-legends"], GAMES.valorant],
  },
  {
    id: "sandbox",
    games: [GAMES.minecraft, GAMES.fortnite],
  },
];

export const STATS: { big: string; small: string }[] = [
  { big: "10,000+ Hours", small: "Spent Playing Games" },
  { big: "100+ Games", small: "Played on 10+ devices" },
];

export type TimelineEvent = {
  year: number;
  /** Short label as drawn on the template (e.g. "CoC"). */
  short: string;
  game: Game;
};

/** "Dates I Started Playing New Games" — ordered start to finish. */
export const TIMELINE: TimelineEvent[] = [
  { year: 2013, short: "CoC", game: GAMES["clash-of-clans"] },
  { year: 2015, short: "MC", game: GAMES.minecraft },
  { year: 2016, short: "CR", game: GAMES["clash-royale"] },
  { year: 2019, short: "FN", game: GAMES.fortnite },
  { year: 2023, short: "Brawl", game: GAMES["brawl-stars"] },
  { year: 2024, short: "Val", game: GAMES.valorant },
  { year: 2025, short: "LoL", game: GAMES["league-of-legends"] },
];

export const YOUTUBE_URL = "https://www.youtube.com/@deathstrxder";
