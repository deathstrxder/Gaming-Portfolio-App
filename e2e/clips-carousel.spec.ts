import { expect, test, type Page } from "@playwright/test";

/**
 * Drives the real carousel on a production build, against the fixture snapshot
 * wired up in playwright.config.ts (three clips: One, Two, Three).
 *
 * Assertions lean on `data-active` as well as visibility, because the cross-fade
 * keeps both layers on screen mid-transition. Under this config's emulated
 * reduced motion the switch is instant, so the two agree — but the attribute is
 * the one that stays true if the timing ever changes.
 */
async function waitForIntro(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.introPhase === "done",
    null,
    { timeout: 30_000 },
  );
}

const carousel = (page: Page) => page.getByTestId("clips-carousel");
const activeLayer = (page: Page) =>
  page.locator('[data-testid="clip-layer"][data-active="true"]');
const hiddenLayers = (page: Page) =>
  page.locator('[data-testid="clip-layer"][data-active="false"]');

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForIntro(page);
  await page.getByRole("heading", { name: "Latest Clips" }).scrollIntoViewIfNeeded();
});

test("shows exactly one clip at a time", async ({ page }) => {
  await expect(page.getByTestId("clip-layer")).toHaveCount(3);
  await expect(activeLayer(page)).toHaveCount(1);
  await expect(activeLayer(page)).toContainText("E2E Clip One");

  // The other two stay mounted so stepping never flashes an empty frame, but
  // they must not be visible, focusable, or clickable.
  await expect(hiddenLayers(page)).toHaveCount(2);
  await expect(hiddenLayers(page).first()).toBeHidden();
  await expect(hiddenLayers(page).last()).toBeHidden();
});

test("next advances the clip and the counter", async ({ page }) => {
  await expect(page.getByTestId("clip-counter")).toContainText("01");

  await page.getByTestId("clip-next").click();

  await expect(activeLayer(page)).toContainText("E2E Clip Two");
  await expect(page.getByTestId("clip-counter")).toContainText("02");
  await expect(activeLayer(page)).toHaveCount(1);
});

test("wraps in both directions", async ({ page }) => {
  await page.getByTestId("clip-next").click();
  await page.getByTestId("clip-next").click();
  await expect(activeLayer(page)).toContainText("E2E Clip Three");

  await page.getByTestId("clip-next").click();
  await expect(activeLayer(page)).toContainText("E2E Clip One");

  await page.getByTestId("clip-prev").click();
  await expect(activeLayer(page)).toContainText("E2E Clip Three");
});

test("a dot jumps straight to its clip", async ({ page }) => {
  await expect(page.getByTestId("clip-dot")).toHaveCount(3);

  await page.getByTestId("clip-dot").nth(2).click();

  await expect(activeLayer(page)).toContainText("E2E Clip Three");
  await expect(page.getByTestId("clip-counter")).toContainText("03");
});

test("arrow keys step between clips", async ({ page }) => {
  await carousel(page).getByTestId("clip-next").focus();

  await page.keyboard.press("ArrowRight");
  await expect(activeLayer(page)).toContainText("E2E Clip Two");

  await page.keyboard.press("ArrowLeft");
  await expect(activeLayer(page)).toContainText("E2E Clip One");
});

test("play swaps the facade for the embed, and navigating away stops it", async ({ page }) => {
  await expect(carousel(page).locator("iframe")).toHaveCount(0);

  await activeLayer(page).getByTestId("clip-play").click();

  const frame = activeLayer(page).locator("iframe");
  await expect(frame).toHaveCount(1);
  await expect(frame).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/e2eClipOne?autoplay=1&rel=0",
  );

  // Leaving a playing clip must not leave audio coming from a hidden layer.
  await page.getByTestId("clip-next").click();
  await expect(carousel(page).locator("iframe")).toHaveCount(0);
  await expect(activeLayer(page).getByTestId("clip-play")).toBeVisible();
});

test("a hidden clip's play control cannot be reached", async ({ page }) => {
  // The layers are stacked in one grid cell, so a hidden facade left clickable
  // would sit over the visible one and swallow the press.
  await expect(hiddenLayers(page).first().getByTestId("clip-play")).toBeHidden();
});

// The triangle is drawn inside a square badge, so any imbalance between the two
// side gaps reads immediately as a crooked button. Measured off the painted <path>
// rather than the <svg> box, because the svg is padded by the viewBox and would
// look centred even when the shape inside it is not.
test("centres the play triangle inside its badge", async ({ page }) => {
  const badge = activeLayer(page).locator('[data-testid="clip-play"] span');
  const triangle = activeLayer(page).locator('[data-testid="clip-play"] path');

  const b = await badge.boundingBox();
  const t = await triangle.boundingBox();
  if (!b || !t) throw new Error("play badge or triangle has no bounding box");

  const gapLeft = t.x - b.x;
  const gapRight = b.x + b.width - (t.x + t.width);
  const gapTop = t.y - b.y;
  const gapBottom = b.y + b.height - (t.y + t.height);

  // Sub-pixel tolerance only — this is geometry, not layout that can reflow.
  expect(Math.abs(gapLeft - gapRight)).toBeLessThan(0.5);
  expect(Math.abs(gapTop - gapBottom)).toBeLessThan(0.5);
});

// Same defect class as the play triangle: a chevron drawn on whole units sits half
// a unit off centre, and the two arrows lean opposite ways, so the pair reads as
// lopsided even though each looks fine alone.
for (const arrow of ["clip-prev", "clip-next"] as const) {
  test(`centres the ${arrow} chevron inside its button`, async ({ page }) => {
    const button = page.getByTestId(arrow);
    const chevron = button.locator("path");

    const b = await button.boundingBox();
    const c = await chevron.boundingBox();
    if (!b || !c) throw new Error(`${arrow} button or chevron has no bounding box`);

    const gapLeft = c.x - b.x;
    const gapRight = b.x + b.width - (c.x + c.width);
    const gapTop = c.y - b.y;
    const gapBottom = b.y + b.height - (c.y + c.height);

    expect(Math.abs(gapLeft - gapRight)).toBeLessThan(0.5);
    expect(Math.abs(gapTop - gapBottom)).toBeLessThan(0.5);
  });
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // Flanking arrows cost 2 × 48px plus gaps. Laid out as a plain flex row that
  // left the clip 214px wide on this viewport — a 214 × 120 video — which no
  // other assertion here could see. Below `sm` the arrows drop to their own row.
  test("gives the clip the full column width", async ({ page }) => {
    const clip = page.locator('[data-testid="clip-layer"][data-active="true"] img');
    const box = await clip.boundingBox();
    if (!box) throw new Error("the active clip has no bounding box");

    // 390 viewport minus the section's 24px side padding.
    expect(box.width).toBeGreaterThan(330);
  });

  test("keeps both arrows and every dot reachable", async ({ page }) => {
    await expect(page.getByTestId("clip-prev")).toBeVisible();
    await expect(page.getByTestId("clip-next")).toBeVisible();
    await expect(page.getByTestId("clip-dot")).toHaveCount(3);

    await page.getByTestId("clip-next").click();
    await expect(activeLayer(page)).toContainText("E2E Clip Two");
  });
});

test("the nav entry scrolls the section into view", async ({ page }) => {
  await page.getByRole("button", { name: /menu/i }).click();
  await page.locator("a").filter({ hasText: "Latest Clips" }).first().click();

  await expect(page.locator("#clips")).toBeInViewport();
});
