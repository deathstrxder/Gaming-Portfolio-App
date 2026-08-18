import { expect, test, type Page } from "@playwright/test";

/**
 * The panel asks for an address first and then decides, by itself, whether that
 * means signing in or signing up.
 *
 * That decision is the whole point of the unified panel, and it is browser-level
 * behaviour: which fields appear, whether a lookup is issued at all, whether a
 * password field is offered for an account that could never accept one. Unit
 * tests cover the lookup endpoint's answers; these cover what the panel does
 * with them.
 *
 * The lookup is stubbed rather than seeded. Creating real accounts would need
 * verification codes, which the console mailer writes to the server's stdout
 * where no browser can read them — a brittle dependency for a test about
 * branching.
 */
async function waitForIntro(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.introPhase === "done",
    null,
    { timeout: 30_000 },
  );
}

/**
 * getByLabel, NOT getByRole("textbox").
 *
 * `<input type="password">` has no implicit ARIA role, so a role-based locator
 * never matches one — which would make every "no password field is shown"
 * assertion below pass whether or not the field was there. Matching the
 * accessible name directly is the only form that can actually fail.
 */
function field(page: Page, name: string) {
  return page.getByLabel(name, { exact: true });
}

/** Stubs the lookup and reports how many times the panel actually called it. */
async function stubLookup(page: Page, body: { exists: boolean; hasPassword: boolean }) {
  const calls = { count: 0 };
  await page.route("**/api/auth/lookup", (route) => {
    calls.count += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  return calls;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForIntro(page);
  await page.locator("#support").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Sign in or sign up" })).toBeVisible();
});

test("opens on one entry step, with no password field in sight", async ({ page }) => {
  await expect(field(page, "Email")).toBeVisible();
  await expect(field(page, "Password")).toHaveCount(0);
  await expect(field(page, "Confirm password")).toHaveCount(0);
});

test("a known address goes to the sign-in step", async ({ page }) => {
  await stubLookup(page, { exists: true, hasPassword: true });

  await field(page, "Email").fill("known@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(field(page, "Password")).toBeVisible();
  // Sign-in only: no confirmation field, because nothing is being created.
  await expect(field(page, "Confirm password")).toHaveCount(0);
});

test("an unknown address goes to the signup step", async ({ page }) => {
  await stubLookup(page, { exists: false, hasPassword: false });

  await field(page, "Email").fill("new@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expect(field(page, "Password")).toBeVisible();
  await expect(field(page, "Confirm password")).toBeVisible();
});

/**
 * A Google-created or Google-claimed account has no password hash, so no
 * password the user could type would ever be accepted. Offering the field would
 * be offering a guaranteed failure.
 */
test("an account with no password offers Google instead of a password field", async ({ page }) => {
  await stubLookup(page, { exists: true, hasPassword: false });

  await field(page, "Email").fill("google-only@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("This account uses Google sign-in.")).toBeVisible();
  await expect(field(page, "Password")).toHaveCount(0);
});

/**
 * The admin signs in with a username rather than an address (lib/auth/admin.ts).
 * There is no account to create from one, so the panel must skip the lookup
 * entirely — both to keep that sign-in working and to keep usernames out of the
 * enumeration surface.
 */
test("a non-email identifier skips the lookup and goes straight to sign-in", async ({ page }) => {
  const calls = await stubLookup(page, { exists: false, hasPassword: false });

  await field(page, "Email").fill("deathstrider");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(field(page, "Password")).toBeVisible();
  expect(calls.count).toBe(0);
});

/**
 * "user@gmail" has an @ but no TLD. Treating it as a username would answer a
 * typo with "incorrect email or password", sending someone hunting for a
 * password problem they do not have.
 */
test("a malformed address is named as such, not treated as a username", async ({ page }) => {
  const calls = await stubLookup(page, { exists: false, hasPassword: false });

  await field(page, "Email").fill("user@gmail");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByText("That does not look like a valid email address.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in or sign up" })).toBeVisible();
  expect(calls.count).toBe(0);
});

/**
 * Google sign-in opens a 30-day session BEFORE a username exists, so a user who
 * abandons at that point — by cancelling a later Google attempt, closing the
 * tab, anything — comes back to a panel that offers only "Choose a username"
 * and no way out. The session keeps them there on every visit.
 */
test("the username step offers a way out of a half-finished account", async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { userId: 1, role: "user", username: null },
        googleEnabled: true,
      }),
    }),
  );
  await page.reload();
  await waitForIntro(page);
  await page.locator("#support").scrollIntoViewIfNeeded();

  await expect(page.getByRole("heading", { name: "Choose a username" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel and sign out" })).toBeVisible();
});

/**
 * The Google callback redirects a brand-new account to /#support so it can pick
 * a username. The browser honours that fragment — and then the intro sequence
 * throws it away: IntroContext pins the view to the top when the intro
 * completes, deliberately, so the page "never autoscrolls to a section".
 *
 * The result is a user mid-signup dumped at the hero, having to scroll down and
 * find the panel again to finish. The same applies to the claimed-account
 * notice and to OAuth errors, which also land on #support.
 */
test("arriving at the panel's section lands ON the panel, not the hero", async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { userId: 1, role: "user", username: null },
        googleEnabled: true,
      }),
    }),
  );

  // about:blank first: beforeEach already loaded "/", and going to "/#support"
  // from there is a same-document fragment change — React never remounts, so
  // the stub above would never be fetched. Arriving from Google is a real
  // cross-document navigation, and this models that.
  await page.goto("about:blank");
  await page.goto("/#support");
  await waitForIntro(page);

  await expect(page.getByRole("heading", { name: "Choose a username" })).toBeVisible();
  await expect(page.locator("#support")).toBeInViewport();
});

test("a normal visit still starts at the top, intro intact", async ({ page }) => {
  await page.goto("about:blank");
  await page.goto("/");
  await waitForIntro(page);

  // No fragment, so the deliberate scroll-to-top must survive this fix.
  await expect(page.locator("#support")).not.toBeInViewport();
});

/**
 * Full motion on purpose.
 *
 * The suite emulates reduced motion, which collapses the opening sequence to
 * roughly half a second — fast enough that "skipped" and "merely quick" look
 * identical. At full motion it runs for several seconds, so reaching `done`
 * inside two can only mean the sequence never played.
 */
test.describe("returning mid-signup", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("skips the opening animation entirely", async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { userId: 1, role: "user", username: null },
          googleEnabled: true,
        }),
      }),
    );

    await page.goto("about:blank");
    await page.goto("/#support");

    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.introPhase), {
        timeout: 2000,
      })
      .toBe("done");

    // And it is already at the panel, rather than arriving there after a delay.
    await expect(page.getByRole("heading", { name: "Choose a username" })).toBeVisible();
    await expect(page.locator("#support")).toBeInViewport();
  });

  test("a normal full-motion visit still plays the intro", async ({ page }) => {
    await page.goto("about:blank");
    await page.goto("/");

    // Still mid-sequence at the point the skipped one had already finished.
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => document.documentElement.dataset.introPhase)).not.toBe("done");
  });
});

/**
 * The panel lives in a section of the home page, so a reload drops the user at
 * the hero with the flow reset — leaving it genuinely unclear whether signing in
 * had worked. Mid-flow the URL must carry the fragment, so a refresh returns to
 * the panel rather than the top of the page.
 */
test("advancing the flow puts the panel in the URL", async ({ page }) => {
  await stubLookup(page, { exists: false, hasPassword: false });

  await field(page, "Email").fill("new@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();

  expect(page.url()).toContain("#support");
});

test("a refresh mid-flow resumes where the user was", async ({ page }) => {
  await stubLookup(page, { exists: false, hasPassword: false });

  await field(page, "Email").fill("new@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();

  await page.reload();
  await waitForIntro(page);

  // Same step, same address — not dumped back to the entry field.
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expect(page.getByText("new@example.com")).toBeVisible();
});

test("starting over clears the resumed state", async ({ page }) => {
  await stubLookup(page, { exists: true, hasPassword: true });

  await field(page, "Email").fill("known@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.getByRole("button", { name: "Use a different email" }).click();
  await page.reload();
  await waitForIntro(page);
  await page.locator("#support").scrollIntoViewIfNeeded();

  await expect(page.getByRole("heading", { name: "Sign in or sign up" })).toBeVisible();
});

test("the address can be corrected without reloading", async ({ page }) => {
  await stubLookup(page, { exists: true, hasPassword: true });

  await field(page, "Email").fill("typo@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.getByRole("button", { name: "Use a different email" }).click();

  await expect(page.getByRole("heading", { name: "Sign in or sign up" })).toBeVisible();
  await expect(field(page, "Email")).toHaveValue("typo@example.com");
});
