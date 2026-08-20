import { expect, test, type Locator, type Page } from "@playwright/test";

/** Mirrors NAV_SECTIONS in lib/games.ts, in document order. */
const SECTION_LABELS = [
  "Most Played Games",
  "Supercell Games",
  "Riot Games",
  "Other Games",
  "Timeline",
  "Latest Clips",
  "Support Me",
  "STEM Resume",
];

/**
 * The intro locks scroll and keeps the nav non-interactive until it settles, and it
 * mirrors its state onto <html data-intro-phase> for the CSS. Wait on that attribute
 * rather than a fixed sleep, so the test does not race the sequence.
 */
async function waitForIntro(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.introPhase === "done",
    null,
    { timeout: 30_000 },
  );
}

const trigger = (page: Page) => page.getByRole("button", { name: /menu/i });
const cabinet = (page: Page) => page.getByTestId("nav-cabinet");
const scrim = (page: Page) => page.getByTestId("nav-scrim");

/** Match on textContent, not the accessible name — the links are uppercased in CSS. */
const linkFor = (root: Locator, label: string) =>
  root.locator("a").filter({ hasText: label });

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("element has no bounding box");
  return b;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForIntro(page);
});

test("keeps the cabinet off-screen until it is opened", async ({ page }) => {
  await expect(cabinet(page)).not.toBeInViewport();
  await expect(linkFor(cabinet(page), "Timeline")).not.toBeInViewport();
});

test("opens into a full-height cabinet on the left edge", async ({ page }) => {
  await trigger(page).click();

  const panel = cabinet(page);
  await expect(panel).toBeInViewport();

  const viewport = page.viewportSize()!;
  const b = await box(panel);

  // Full-height edge drawer: flush left, spanning the viewport.
  expect(b.x).toBeLessThanOrEqual(1);
  expect(b.height).toBeGreaterThanOrEqual(viewport.height * 0.95);
});

test("shows every section label without clipping it", async ({ page }) => {
  await trigger(page).click();
  const panel = cabinet(page);
  const panelBox = await box(panel);

  for (const label of SECTION_LABELS) {
    const link = linkFor(panel, label);
    await expect(link, `"${label}" should be visible in the cabinet`).toBeVisible();

    // The complaint the horizontal bar could never answer: the last labels were cut
    // off at the bar's edge. Every link must sit fully inside the panel.
    const linkBox = await box(link);
    expect(
      linkBox.x + linkBox.width,
      `"${label}" overflows the cabinet's right edge`,
    ).toBeLessThanOrEqual(panelBox.x + panelBox.width + 0.5);
  }
});

test("darkens the rest of the page while open", async ({ page }) => {
  await expect(scrim(page)).toHaveCount(0);

  await trigger(page).click();
  const overlay = scrim(page);
  await expect(overlay).toBeVisible();

  // It must actually darken — a transparent click-catcher would satisfy "present".
  // Measure perceived darkness (background alpha × element opacity) rather than the
  // colour string: Tailwind v4 emits opacity modifiers as `oklab(0 0 0 / 0.6)`, so an
  // rgba-only parser silently reads zero and the assertion passes or fails for the
  // wrong reason. Polled because the scrim fades in.
  await expect
    .poll(
      () =>
        overlay.evaluate((el) => {
          const cs = getComputedStyle(el);
          const c = cs.backgroundColor;
          const slash = c.match(/\/\s*([\d.]+)(%?)\s*\)/);
          let bgAlpha: number;
          if (slash) {
            bgAlpha = slash[2] === "%" ? parseFloat(slash[1]) / 100 : parseFloat(slash[1]);
          } else {
            const m = c.match(/rgba?\(([^)]+)\)/);
            const parts = m ? m[1].split(",").map((p) => parseFloat(p)) : [];
            bgAlpha = parts.length > 3 ? parts[3] : m ? 1 : 0;
          }
          return bgAlpha * parseFloat(cs.opacity || "1");
        }),
      { timeout: 5_000 },
    )
    .toBeGreaterThan(0.2);

  const viewport = page.viewportSize()!;
  const b = await box(overlay);
  expect(b.width).toBeGreaterThanOrEqual(viewport.width * 0.95);
  expect(b.height).toBeGreaterThanOrEqual(viewport.height * 0.95);
});

test("never overlaps the hero's social icons", async ({ page }) => {
  await trigger(page).click();

  // Whichever icon sits nearest the cabinet is the one that matters, and which one
  // that is depends on how the rail is laid out — measure both rather than assume an
  // order, so this keeps guarding if the icons are rearranged again.
  const icons = [
    page.getByRole("button", { name: /discord/i }),
    page.getByRole("link", { name: /youtube/i }).first(),
  ];
  const lefts: number[] = [];
  for (const icon of icons) {
    await expect(icon).toBeVisible();
    lefts.push((await box(icon)).x);
  }

  // The regression this redesign exists to kill, asserted on real geometry rather
  // than computed from stylesheets.
  const panelBox = await box(cabinet(page));
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(Math.min(...lefts));
});

test("closes on Escape and on a click outside", async ({ page }) => {
  await trigger(page).click();
  await expect(cabinet(page)).toBeInViewport();

  await page.keyboard.press("Escape");
  await expect(cabinet(page)).not.toBeInViewport();

  await trigger(page).click();
  await expect(cabinet(page)).toBeInViewport();

  // Click well clear of the panel — the scrim spans the whole viewport, so its own
  // top-left corner sits underneath the cabinet and would not receive the click.
  await scrim(page).click({ position: { x: 900, y: 400 } });
  await expect(cabinet(page)).not.toBeInViewport();
});

/**
 * Everything above runs under emulated reduced motion, which keeps the suite fast but
 * means a regression that only shows at full motion would pass unnoticed — e.g. if the
 * panel were ever hidden by a transition rather than by its transform. One smoke test
 * at full motion guards that, at the cost of the intro's real 5.5s.
 */
test.describe("at full motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("still opens and closes", async ({ page }) => {
    await expect(cabinet(page)).not.toBeInViewport();
    await trigger(page).click();
    await expect(cabinet(page)).toBeInViewport();
    await expect(scrim(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(cabinet(page)).not.toBeInViewport();
  });
});

test("stays open when a section is selected", async ({ page }) => {
  await trigger(page).click();
  await linkFor(cabinet(page), "Timeline").click();

  // Picking a section jumps the page but deliberately leaves the cabinet open, so
  // a visitor can move between sections without reopening it each time.
  await expect(cabinet(page)).toBeInViewport();
});
