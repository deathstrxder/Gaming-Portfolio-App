# Eddie Zeng — Gaming Portfolio

A single-page personal gaming portfolio for Eddie Zeng ("Amateur Gamer", [@deathstrxder](https://www.youtube.com/@deathstrxder)).
It showcases his most-played games, lifetime stats, and a timeline of every game he has picked up since 2013.

The site is a scroll-driven experience with a neon, heads-up-display aesthetic: an animated backdrop, glowing splash-art game cards, and scroll-linked reveal animations.

## What's on the page

The whole site is one route (`app/page.tsx`) composed of stacked sections:

- **Eddie** (`EddieHome`) — animated GIF backdrop, self-portrait, name, and social links (a Discord username popup and a YouTube link).
- **Most Played** (`MostPlayed`) — lifetime stat tiles plus an icon grid of all seven games.
- **Game showcases** (`GameSection`) — three rows of splash-art game cards, grouped as Supercell, Competitive, and Sandbox.
- **Timeline** (`Timeline`) — the years Eddie started each new game, from Clash of Clans (2013) to League of Legends (2025).
- **Footer** — handle and tagline.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with [React 19](https://react.dev) and TypeScript.
- [Tailwind CSS v4](https://tailwindcss.com) using the CSS-first `@theme` configuration in `app/globals.css`.
- [Motion](https://motion.dev) (the successor to Framer Motion) for entrance and scroll-linked animations.
- shadcn/ui-style primitives built on Radix Slot, `class-variance-authority`, `clsx`, and `tailwind-merge`.
- [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) with Orbitron (display) and Rajdhani (body).

## Getting started

Requires Node.js 20+.

```bash
npm install      # first time only — dependencies are already vendored in node_modules
npm run dev      # start the dev server at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
The page hot-reloads as you edit files under `app/`, `components/`, and `lib/`.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with hot reload. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build (run `build` first). |
| `npm run lint` | Run ESLint. |

## Project structure

```
app/
  layout.tsx        Root layout: fonts, metadata, <html>/<body> shell
  page.tsx          The single page, composed of the section components
  globals.css       Tailwind v4 theme tokens, ambient background, utilities
  icon.png          Favicon (a static center frame of the backdrop GIF)
components/
  site/             Page sections (EddieHome, MostPlayed, GameSection, Timeline, ...)
  ui/               Reusable primitives (button, card)
lib/
  games.ts          Single source of truth for all game data
  utils.ts          `cn()` class-name helper
public/gaming/      Shipped, web-ready assets (logos, splash art, icons, backdrop GIF)
media/              Raw design-source assets (git-ignored, not part of the build)
```

## Content and data

All content lives in [`lib/games.ts`](lib/games.ts), which is the single source of truth for the page:

- `GAMES` — each game's name, art paths (`logo`, `splash`, `icon`), and bullet-point highlights.
- `ALL_GAMES` — the icon grid order for the "Most Played" section.
- `SECTION_GROUPS` — the three game-showcase rows.
- `TIMELINE` — the year Eddie started each game.
- `STATS` — the headline lifetime numbers.
- `YOUTUBE_URL` — the channel link used in the hero and footer.

To add a game, drop its art into `public/gaming/{logos,splash,icons}/`, add an entry to `GAMES`, then reference it from `SECTION_GROUPS`, `ALL_GAMES`, and/or `TIMELINE`.

## Assets

Web-ready images ship from `public/gaming/` and are served as-is (`images.unoptimized` is set in `next.config.ts`, so no `sharp` optimizer is needed at runtime).
The raw source art — logos, splash art, icons, and the "To The Moon" backdrop GIF — lives in `media/` and is git-ignored; only the processed copies under `public/gaming/` are part of the site.
The favicon (`app/icon.png`) is a static center frame extracted from that backdrop GIF.

## Design system

The look is defined by the theme tokens in `app/globals.css`:

- Dark-only palette on a near-black background (`--color-bg: #07080f`).
- Neon accents in cyan (`--color-neon-blue: #22d3ee`) and purple (`--color-neon-purple: #b026ff`).
- Orbitron for display type and Rajdhani for body text.
- An ambient neon glow wash and a faint HUD grid rendered behind all content.

Animations respect `prefers-reduced-motion` and degrade to static content.

## Notes for contributors

This project pins a modified build of Next.js (see `AGENTS.md`).
Before writing code that touches framework conventions, read the relevant guide under `node_modules/next/dist/docs/` — APIs and file conventions may differ from stock Next.js.
