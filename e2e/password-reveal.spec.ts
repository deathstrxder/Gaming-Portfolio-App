import { expect, test, type Page } from "@playwright/test";

/**
 * Drives the real password reveal toggle on a production build, through the auth
 * panel in the "Support the site" section.
 *
 * `PasswordInput.test.tsx` renders to static markup, so it can only assert the
 * *initial* HTML. Everything that makes this component risky is browser-level —
 * whether the eye submits the form it sits in, whether one field's toggle reveals
 * its neighbour, whether the field survives the flip as the same node, whether a
 * keyboard can reach it at all. None of that can fail a static-markup test.
 *
 * Design notes for the assertions below live in
 * docs/superpowers/specs/2026-08-13-password-reveal-e2e-design.md.
 */

declare global {
  interface Window {
    /** Capture-phase submit counter installed by the no-submit test. */
    __signupSubmits?: number;
  }
}

/** Satisfies all five checks in `isPasswordValid`: length, upper, lower, digit, special. */
const VALID_PASSWORD = "E2ePass!1";
const VALID_EMAIL = "e2e@example.test";

async function waitForIntro(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.introPhase === "done",
    null,
    { timeout: 30_000 },
  );
}

/**
 * `exact` is not optional. `getByLabel` matches partially by default, so a loose
 * "Password" would also match "Confirm password" *and* the toggle's own
 * "Show password", and strict mode would fail the locator rather than the assertion.
 */
const field = (page: Page, name: string) => page.getByLabel(name, { exact: true });

/**
 * Each field's own toggle, resolved through its direct parent rather than by index:
 * `PasswordInput` renders the input and its toggle as siblings of one wrapper, so a
 * field added elsewhere in the form cannot silently repoint this locator.
 */
const toggleFor = (page: Page, name: string) =>
  field(page, name).locator("xpath=..").getByTestId("password-toggle");

async function fillValidSignup(page: Page) {
  await field(page, "Email").fill(VALID_EMAIL);
  await field(page, "Password").fill(VALID_PASSWORD);
  // Must match: handleSignup returns on `password !== confirm` before it ever
  // reaches the request, which would make the positive control below fail for
  // the wrong reason.
  await field(page, "Confirm password").fill(VALID_PASSWORD);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForIntro(page);
  await page.locator("#support").scrollIntoViewIfNeeded();
  // AuthPanel opens on a "loading" step until /api/auth/me resolves. With no
  // session it lands on signup, which is the step every test below starts from.
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
});

test("reveals and re-hides the typed password", async ({ page }) => {
  const input = field(page, "Password");
  await input.fill("hunter2");
  await expect(input).toHaveAttribute("type", "password");

  await toggleFor(page, "Password").click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toHaveValue("hunter2");

  await toggleFor(page, "Password").click();
  await expect(input).toHaveAttribute("type", "password");
  await expect(input).toHaveValue("hunter2");
});

// The signup step renders two PasswordInputs. Visibility hoisted out of the
// component — a module-level variable, a context — would reveal both at once,
// which is a password on screen the user never asked to show.
test("reveals only its own field", async ({ page }) => {
  await field(page, "Password").fill("hunter2");
  await field(page, "Confirm password").fill("hunter2");

  await toggleFor(page, "Password").click();

  await expect(field(page, "Password")).toHaveAttribute("type", "text");
  await expect(field(page, "Confirm password")).toHaveAttribute("type", "password");
});

/**
 * The regression this pins: a button inside a form defaults to type="submit", so
 * dropping `type="button"` makes revealing the password submit the signup.
 *
 * The obvious version of this test — click the eye on an empty form, check nothing
 * happened — passes *even with the bug*, because the required fields fail native
 * constraint validation and the submit never reaches React. So the form is filled
 * with values that are valid both natively and to `isPasswordValid`.
 *
 * The oracle is a capture-phase submit listener rather than the network: a submit
 * button fires that event synchronously during the click dispatch, so the answer
 * already exists when `click()` resolves. Watching only for a request would race
 * the request it is watching.
 */
test("the toggle does not submit the form", async ({ page }) => {
  let signupRequests = 0;
  await page.route("**/api/auth/signup", async (route) => {
    signupRequests += 1;
    // 409 keeps the panel on its signup step with a known error, and nothing
    // reaches the database.
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: "already registered" }),
    });
  });

  await fillValidSignup(page);

  await page.evaluate(() => {
    window.__signupSubmits = 0;
    const input = document.querySelector('input[aria-label="Password"]');
    input?.closest("form")?.addEventListener(
      "submit",
      () => {
        window.__signupSubmits = (window.__signupSubmits ?? 0) + 1;
      },
      true,
    );
  });

  const toggle = toggleFor(page, "Password");
  await expect(toggle).toHaveAttribute("type", "button");

  await toggle.click();

  expect(await page.evaluate(() => window.__signupSubmits)).toBe(0);
  expect(signupRequests).toBe(0);
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expect(page.getByText("That email is already registered.")).toHaveCount(0);

  // Positive control. Without it, a test that had quietly stopped being able to
  // submit at all would keep reporting green forever.
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  expect(await page.evaluate(() => window.__signupSubmits)).toBe(1);
  await expect.poll(() => signupRequests).toBe(1);
});

// Browsers key password-manager behaviour off autoComplete, so revealing the field
// must not disturb it.
test("keeps autocomplete across a reveal", async ({ page }) => {
  const input = field(page, "Password");
  await expect(input).toHaveAttribute("autocomplete", "new-password");

  await toggleFor(page, "Password").click();

  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toHaveAttribute("autocomplete", "new-password");
});

/**
 * A `key={visible ? "a" : "b"}` on the input rebuilds the element on every toggle.
 * Because the call sites are controlled inputs, the rebuilt node still shows the
 * typed value and still carries autocomplete, so no attribute check can see it.
 * An expando survives a re-render and cannot survive a remount.
 */
test("flips the field in place rather than rebuilding it", async ({ page }) => {
  const input = field(page, "Password");
  await input.fill("hunter2");
  await input.evaluate((el: HTMLInputElement & { __e2eMark?: number }) => {
    el.__e2eMark = 42;
  });

  await toggleFor(page, "Password").click();
  await expect(input).toHaveAttribute("type", "text");

  const mark = await input.evaluate(
    (el: HTMLInputElement & { __e2eMark?: number }) => el.__e2eMark,
  );
  expect(mark).toBe(42);
});

// The toggle is deliberately left in the tab order: a keyboard-only user has the
// most need to check what they actually typed.
test("is reachable and operable from the keyboard", async ({ page }) => {
  const input = field(page, "Password");
  await input.fill("hunter2");
  await input.focus();

  await page.keyboard.press("Tab");
  await expect(toggleFor(page, "Password")).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(input).toHaveAttribute("type", "text");

  await page.keyboard.press("Space");
  await expect(input).toHaveAttribute("type", "password");
});

// An icon-only control whose only state cue is the drawn glyph tells a screen
// reader nothing.
test("announces its state", async ({ page }) => {
  const toggle = toggleFor(page, "Password");
  await expect(toggle).toHaveAttribute("aria-label", "Show password");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-label", "Hide password");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

/**
 * Measured off the painted <path>, not the <svg> box, which the viewBox pads — an
 * svg can be perfectly centred while the shape inside it is visibly off. Same
 * defect class as the play badge and the nav chevrons, both already fixed.
 *
 * The two states need different invariants because they are different shapes. EYE
 * is symmetric and must be centred. EYE_OFF is an intentionally asymmetric
 * corner-to-corner slash, so its painted bounds are NOT centred in the viewBox, and
 * demanding that they were would push the eye off-centre and make it jump on
 * toggle. What must hold in the revealed state is that nothing moves.
 */
test("centres the glyph in both states", async ({ page }) => {
  const button = toggleFor(page, "Password");
  const svg = button.locator("svg");
  const path = button.locator("path");

  /**
   * Every measurement is taken relative to the button box *from the same layout
   * pass*. Clicking can scroll the page, and comparing a box captured before the
   * click against one captured after would compare two coordinate systems.
   */
  const geometry = async () => {
    const b = await button.boundingBox();
    const s = await svg.boundingBox();
    const p = await path.boundingBox();
    if (!b || !s || !p) throw new Error("toggle, svg or glyph has no bounding box");
    return {
      svgInButton: { x: s.x - b.x, y: s.y - b.y, width: s.width, height: s.height },
      glyphOffset: {
        x: p.x + p.width / 2 - (b.x + b.width / 2),
        y: p.y + p.height / 2 - (b.y + b.height / 2),
      },
    };
  };

  // Measured 2026-08-13: button 48 × 50, svg at (14, 15) inside it, EYE glyph
  // 18.33 × 12.50 centred to 0.000 on both axes.
  const hidden = await geometry();
  expect(Math.abs(hidden.glyphOffset.x)).toBeLessThan(0.5);
  expect(Math.abs(hidden.glyphOffset.y)).toBeLessThan(0.5);

  await button.click();
  const revealed = await geometry();

  // The icon box must not move or resize when the state flips, or the eye visibly
  // jumps under the cursor.
  expect(Math.abs(revealed.svgInButton.x - hidden.svgInButton.x)).toBeLessThan(0.5);
  expect(Math.abs(revealed.svgInButton.y - hidden.svgInButton.y)).toBeLessThan(0.5);
  expect(Math.abs(revealed.svgInButton.width - hidden.svgInButton.width)).toBeLessThan(0.5);
  expect(Math.abs(revealed.svgInButton.height - hidden.svgInButton.height)).toBeLessThan(0.5);

  // EYE_OFF's slash reaches past the eye, so its painted bounds sit slightly low
  // by design — measured at x -0.004, y +0.417. 1px is loose enough for that and
  // tight enough to catch a translated path.
  expect(Math.abs(revealed.glyphOffset.x)).toBeLessThan(1);
  expect(Math.abs(revealed.glyphOffset.y)).toBeLessThan(1);
});

// A glyph can stay perfectly centred while the box around it shrinks to something
// no thumb can hit.
test("keeps a 44px hit target", async ({ page }) => {
  const box = await toggleFor(page, "Password").boundingBox();
  if (!box) throw new Error("toggle has no bounding box");

  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

/**
 * Not a bounding-box comparison: the input fills the wrapper and the button is
 * absolutely positioned *over* its right edge, so the two boxes overlap in the
 * correct implementation too. The real question is where the text can reach, which
 * is the content box — border and padding subtracted.
 */
test("never lets the text run under the icon", async ({ page }) => {
  const contentRight = await field(page, "Password").evaluate((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
  });

  const button = await toggleFor(page, "Password").boundingBox();
  if (!button) throw new Error("toggle has no bounding box");

  expect(contentRight).toBeLessThanOrEqual(button.x + 0.5);
});

// `right-0` → `-right-12` detaches the eye from its field while leaving behaviour,
// keyboard operation, glyph centring, hit target and padding all intact.
test("keeps the toggle inside its own field", async ({ page }) => {
  const input = await field(page, "Password").boundingBox();
  const button = await toggleFor(page, "Password").boundingBox();
  if (!input || !button) throw new Error("field or toggle has no bounding box");

  expect(button.x).toBeGreaterThanOrEqual(input.x - 0.5);
  expect(button.y).toBeGreaterThanOrEqual(input.y - 0.5);
  expect(button.x + button.width).toBeLessThanOrEqual(input.x + input.width + 0.5);
  expect(button.y + button.height).toBeLessThanOrEqual(input.y + input.height + 0.5);

  // Flush to the field's right edge.
  expect(Math.abs(input.x + input.width - (button.x + button.width))).toBeLessThan(0.5);
});

test("works the same on the login step", async ({ page }) => {
  await page.getByRole("button", { name: "Already have an account? Login instead!" }).click();
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

  const input = field(page, "Password");
  await expect(input).toHaveAttribute("autocomplete", "current-password");
  await input.fill("hunter2");

  await toggleFor(page, "Password").click();

  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toHaveValue("hunter2");
});

/**
 * A placeholder is not a label: it disappears the moment the user types, and it is
 * not reliably announced as the field's name.
 *
 * The verify and username steps sit behind a successful signup, which would
 * normally mean a database write. Route interception reaches them without one —
 * but interception alone stops at verify, because handleVerify only runs on submit.
 * So the walk fills and submits at each step, exactly as a user would.
 */
test("names every field on every step", async ({ page }) => {
  await expect(field(page, "Email")).toBeVisible();
  await expect(field(page, "Password")).toBeVisible();
  await expect(field(page, "Confirm password")).toBeVisible();

  // The login step's own email field is pinned by nothing else: the login test
  // above only ever touches its password.
  await page.getByRole("button", { name: "Already have an account? Login instead!" }).click();
  await expect(field(page, "Email")).toBeVisible();
  await expect(field(page, "Password")).toBeVisible();

  await page.getByRole("button", { name: "Need an account? Sign up instead!" }).click();
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();

  await page.route("**/api/auth/signup", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ userId: 1, code: "123456" }),
    }),
  );
  await page.route("**/api/auth/verify", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ username: null }),
    }),
  );

  await fillValidSignup(page);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await field(page, "Verification code").fill("123456");
  await page.getByRole("button", { name: "Verify", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Choose a username" })).toBeVisible();
  await expect(field(page, "Username")).toBeVisible();
});

/**
 * `opacity-0` anywhere from the button down to the svg leaves geometry, ARIA state
 * and keyboard behaviour completely intact — and Playwright reports an
 * opacity-zero element as *visible*, a trap this repo already documents in
 * app/globals.css. So this checks the painted path itself, through its whole
 * ancestor chain, and rejects a transparent fill.
 */
test("is actually painted", async ({ page }) => {
  const path = toggleFor(page, "Password").locator("path");

  const painted = await path.evaluate((el) => ({
    visible: el.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    fill: getComputedStyle(el).fill,
  }));

  expect(painted.visible).toBe(true);
  expect(painted.fill).not.toMatch(/,\s*0\s*\)$/);

  const box = await path.boundingBox();
  if (!box) throw new Error("glyph has no bounding box");
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
});
