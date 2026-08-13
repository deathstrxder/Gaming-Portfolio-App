import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AccountScreen } from "@/components/site/member/AccountScreen";

// AccountScreen renders inside MemberChrome, and both call useRouter at render
// time, which throws outside a mounted app router. Nothing asserted here touches
// navigation, so a stub is enough. vitest hoists this above the import.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));

/**
 * A placeholder is not a label: it vanishes as soon as the user types, and the
 * birthday field is a bare date input with no placeholder at all.
 *
 * These four names are pinned here rather than end-to-end because the screen sits
 * behind an authenticated session and the Playwright harness has no auth fixture.
 * Without this test they would be pinned by nothing.
 */
describe("AccountScreen", () => {
  it("names every field", () => {
    const html = renderToStaticMarkup(<AccountScreen hasPassword />);

    for (const name of ["New username", "Current password", "New password", "Birthday"]) {
      expect(html).toContain(`aria-label="${name}"`);
    }
  });
});
