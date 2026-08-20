import { expect, test, type Page } from "@playwright/test";

/**
 * The resume section's runtime contract. Unit tests pin the SSR markup; these
 * pin what only a browser can: the one-shot entrance actually plays, the
 * reduced-motion fallback shows everything immediately, and the PDF is served.
 */
async function waitForIntro(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.introPhase === "done",
    null,
    { timeout: 30_000 },
  );
}

const SIX_AWARDS = [
  "Quality",
  "Judges",
  "Innovation in Control",
  "Gracious Professionalism",
  "Excellence in Engineering",
  "Team Spirit",
];

test.describe("stem resume section", () => {
  test("shows every panel and all six awards under reduced motion, no scrolling needed", async ({ page }) => {
    await page.goto("/");
    await waitForIntro(page);
    // The suite-wide reducedMotion emulation must mean "content rests visible",
    // or a reduced-motion visitor meets a blank section.
    const section = page.locator("#stem-resume");
    for (const award of SIX_AWARDS) {
      await expect(section.getByText(award, { exact: true })).toHaveCount(1);
    }
    for (const designator of ["A1", "B1", "C1", "C2", "D1", "E1"]) {
      await expect(section.getByText(designator, { exact: true })).toBeVisible();
    }
    const first = section.locator(".ronce-item").first();
    await expect
      .poll(() => first.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("1");
  });

  test("serves the resume PDF", async ({ request }) => {
    const res = await request.get("/eddie-zeng-stem-resume.pdf");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
  });

  test("nav cabinet reaches the section", async ({ page }) => {
    await page.goto("/");
    await waitForIntro(page);
    await page.getByRole("button", { name: /menu/i }).click();
    await page.getByTestId("nav-cabinet").locator("a", { hasText: "STEM Resume" }).click();
    await expect
      .poll(async () => {
        const box = await page.locator("#stem-resume").boundingBox();
        return box ? Math.abs(box.y) < page.viewportSize()!.height : false;
      })
      .toBe(true);
  });
});

test.describe("stem resume entrance (full motion)", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("panels are hidden before scroll and arrive once scrolled into view", async ({ page }) => {
    await page.goto("/");
    await waitForIntro(page);
    const first = page.locator("#stem-resume .ronce-item").first();
    // Computed style, NOT toBeVisible(): Playwright counts opacity:0 as visible.
    await expect
      .poll(() => first.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("0");
    // NOT scrollIntoViewIfNeeded on the section: that does the MINIMAL scroll,
    // parking the section's top edge at the viewport bottom — inside the
    // observer's excluded bottom-12% band, where the entrance correctly does
    // not fire yet. A real reader scrolls content INTO the band (the nav-click
    // anchor scroll aligns the section top to the viewport top, for example),
    // so scroll the title to center, the position an actual reader occupies.
    await page
      .locator("#stem-resume-title")
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect
      .poll(() => first.evaluate((el) => getComputedStyle(el).opacity), { timeout: 5_000 })
      .toBe("1");
  });

  test("the bottom panel still arrives at maximum scroll", async ({ page }) => {
    // The geometry this design exists to guard: the LAST panel sits above the
    // footer, where scroll room runs out. It must still cross the observer's
    // -12% band at maximum scroll — if the band ever deepens (or the footer
    // shrinks), content strands invisible for motion users and only this test
    // notices; the reduced-motion profile passes via the !important override.
    await page.goto("/");
    await waitForIntro(page);
    const last = page.locator("#stem-resume .ronce-item").last();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect
      .poll(() => last.evaluate((el) => getComputedStyle(el).opacity), { timeout: 5_000 })
      .toBe("1");
  });
});
