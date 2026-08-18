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
  /**
   * Capped well below the default of half the logical cores (10 here).
   *
   * Every spec opens `/`, which loads the full home page and waits out the
   * intro. Ten of those starting at once against a server that has just been
   * built saturates the machine, and `page.goto` in beforeEach starts blowing
   * the 60s test timeout — a failure that looks like a broken page but is only
   * congestion. The working tree also lives in a OneDrive folder, so a fresh
   * build hands the sync client thousands of files to chew on at exactly the
   * moment the run starts.
   *
   * Measured on this machine: 10 workers failed 10 of 24 specs on `page.goto`
   * and took 3.4m; 4 workers passed all 24 in 2.3m. Fewer workers is both
   * steadier and faster, so there is nothing to trade off.
   */
  workers: 4,
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
    /**
     * Deliberately false, after it silently invalidated a whole run.
     *
     * `true` reuses whatever is already listening on the port WITHOUT
     * rebuilding. A server left over from an earlier run then serves stale code
     * to every subsequent run — which cost an afternoon here: three specs
     * "failed" against a build that predated the feature they tested, while the
     * feature itself was fine.
     *
     * The false-failure is the benign direction. The same mechanism silently
     * produces false PASSES when a spec is fixed but the server is old, and a
     * suite that can pass against code you are not running is worse than a slow
     * one. The rebuild costs about 40 seconds.
     */
    reuseExistingServer: false,
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

      // Test-only, and only ever seen by the server Playwright spawns. Without
      // it the suite silently depended on a developer's .env.local: iron-session
      // rejects a short password, so /api/auth/me threw, and the auth panel fell
      // back to its signup step through an error path rather than a real one.
      // The specs still passed, which is exactly what made it worth pinning —
      // a suite that only works on one machine is not a suite.
      IRON_SESSION_PASSWORD: "e2e-only-not-a-real-secret-32-chars-min",
    },
  },
});
