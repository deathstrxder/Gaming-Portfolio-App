import { expect, test, type Page } from "@playwright/test";

/**
 * The custom cursors are base64 PNGs inside a CSS custom property. If one of
 * them is ever corrupted — a truncated re-paste, a bad pipeline run — the
 * browser silently ignores the image and falls back to the OS arrow or hand.
 * Nothing looks broken enough to notice, the site just quietly stops being
 * itself.
 *
 * app/globals.cursor.test.ts decodes the same bytes in node, which proves the
 * file is well-formed but not that a browser will accept it. This drives the
 * real page and makes the browser decode them.
 */
async function waitForIntro(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.introPhase === "done",
    null,
    { timeout: 30_000 },
  );
}

/** The data URI a real element actually resolves to, via computed style. */
async function cursorUri(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`no element for ${sel}`);
    const match = getComputedStyle(el).cursor.match(/url\("(data:image\/png;base64,[^"]+)"\)/);
    return match ? match[1] : null;
  }, selector);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForIntro(page);
});

test("dresses the page and its clickables in the two custom blades", async ({ page }) => {
  const resting = await cursorUri(page, "html");
  const clickable = await cursorUri(page, "button");

  expect(resting).not.toBeNull();
  expect(clickable).not.toBeNull();
  // Hovering a clickable lights the gem, so the two must not be the same image.
  expect(clickable).not.toBe(resting);
});

// A cursor the browser refuses to decode is indistinguishable from no custom
// cursor at all, so decoding is the assertion that matters.
test("both blades decode in the browser at their true size", async ({ page }) => {
  for (const selector of ["html", "button"]) {
    const uri = await cursorUri(page, selector);
    const size = await page.evaluate(
      (src) =>
        new Promise<{ width: number; height: number } | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve(null);
          img.src = src!;
        }),
      uri,
    );

    expect(size, `${selector} cursor failed to decode`).not.toBeNull();
    expect(size).toEqual({ width: 23, height: 32 });
  }
});

// The hotspot is the blade's tip. If it drifts, every click lands off-target
// from where the user aimed, which is far worse than a cosmetic slip.
test("keeps the hotspot on the blade tip", async ({ page }) => {
  const declaration = await page.evaluate(() => getComputedStyle(document.body).cursor);
  expect(declaration).toMatch(/\)\s*3\s+2,/);
});
