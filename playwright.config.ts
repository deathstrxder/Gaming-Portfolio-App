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
  },
});
