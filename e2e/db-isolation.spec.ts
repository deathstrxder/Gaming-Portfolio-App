import { test, expect } from "@playwright/test";

/**
 * Guards the thing that is easy to break and silent when broken.
 *
 * `webServer.env` MERGES with the parent environment, so a developer with
 * TURSO_DATABASE_URL in .env.local was, before this was fixed, running the whole
 * suite against the PRODUCTION database — every spec loads `/`, and the
 * analytics beacon fires on page view, section view and click, so real dashboard
 * numbers were being inflated by test traffic.
 *
 * Counting events cannot detect a regression here, because the bot filter
 * discards headless traffic before it is ever written, so the count is zero
 * either way. The user count can: the throwaway database is created by
 * global-setup and never seeded, while production carries the seeded admin
 * account. Zero users therefore means "not production".
 *
 * If this ever fails, do not seed the E2E database to make it pass — check
 * where the app under test is actually connected.
 */
test("runs against a throwaway database, not production", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);

  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.users).toBe(0);
});
