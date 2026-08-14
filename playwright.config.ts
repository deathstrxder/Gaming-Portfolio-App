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
    },
  },
});
