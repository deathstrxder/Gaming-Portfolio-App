import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E config for the UI checks that unit tests cannot make: real layout, real
 * geometry, real interaction.
 *
 * Tests run against a PRODUCTION build rather than `next dev` on purpose. The dev
 * server on this machine has been observed serving stale global CSS (Turbopack over
 * a OneDrive-synced working tree), and a layout assertion against stale CSS is worse
 * than no assertion — it reports green on the wrong stylesheet.
 *
 * `reducedMotion` is emulated so the intro sequence settles in ~0.5s instead of 5.5s
 * (IntroBar's sweep drops 2200ms → 500ms, IntroProvider's tail 3300ms → 30ms). It is
 * safe for the assertions here because the site suppresses transition *durations*
 * under reduced motion, not the transforms that place an element on or off screen.
 */
export default defineConfig({
  testDir: "./e2e",
  // Creates and migrates the throwaway database named in webServer.env below,
  // so the suite depends on no database file committed to the repository.
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    // reducedMotion is a context option in this Playwright version, not a top-level
    // `use` key — setting it directly on `use` is a type error, not a silent no-op.
    contextOptions: { reducedMotion: "reduce" },
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 300_000,
    // The bundled seed carries no providers, so the clips section would render its
    // empty state and there would be nothing to drive. This points the snapshot
    // reader at a committed fixture instead. See lib/stats/read.ts.
    //
    // `__dirname`, not `import.meta.url`: Playwright transpiles this config to CJS
    // before loading it, so `import.meta` is a SyntaxError here even though the
    // same expression is fine in vitest.config.ts, which Vite loads as ESM.
    //
    // The fixture lives beside the specs rather than under `data/`, which
    // `.gitignore` excludes wholesale to keep the local SQLite database out of
    // the repo. Its thumbnails are inline `data:` URIs, so a test run neither
    // reaches i.ytimg.com nor ships a fixture image to production.
    env: {
      STATS_SNAPSHOT_FILE: path.join(__dirname, "e2e", "fixtures", "stats-snapshot.json"),

      // Keeps the run off the production database.
      //
      // `env` MERGES with the parent environment rather than replacing it, so
      // there is no way to unset an inherited TURSO_DATABASE_URL from here — an
      // empty string is the only lever available. That works only because
      // lib/db/url.ts treats blank as unset; a plain `??` would hand the blank
      // string to createClient and throw at import time.
      //
      // Without this, every spec's page load wrote synthetic analytics rows into
      // the LIVE events table, which the admin dashboard then reported as real
      // visitors.
      TURSO_DATABASE_URL: "",
      DATABASE_PATH: path.join(__dirname, "data", "e2e", "app.db"),

      // The suite drives 24 specs across 4 workers from a single address, and
      // each page load emits a page_view plus a section_view per section —
      // several hundred events inside one ten-minute window, against a limit of
      // 300. Without this the run would start returning 429s partway through and
      // the failures would read as broken pages rather than as a throttle.
      //
      // Honoured only outside production (see lib/security/rate-limit.ts), so it
      // cannot weaken the deployed app.
      RATE_LIMIT_DISABLED: "1",
    },
  },
});
