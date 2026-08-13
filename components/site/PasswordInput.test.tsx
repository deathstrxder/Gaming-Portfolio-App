import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "@/components/site/PasswordInput";

describe("PasswordInput", () => {
  it("starts masked", () => {
    const html = renderToStaticMarkup(<PasswordInput placeholder="Password" />);
    expect(html).toContain('type="password"');
    expect(html).not.toContain('type="text"');
  });

  it("offers a labelled toggle", () => {
    const html = renderToStaticMarkup(<PasswordInput placeholder="Password" />);
    expect(html).toContain('data-testid="password-toggle"');
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('aria-pressed="false"');
  });

  // Inside a form a <button> without an explicit type defaults to submit, so
  // revealing the password would submit the login form.
  it("uses a non-submitting button", () => {
    const html = renderToStaticMarkup(<PasswordInput placeholder="Password" />);
    const toggle = /<button[^>]*data-testid="password-toggle"[^>]*>/.exec(html);
    expect(toggle).not.toBeNull();
    expect(toggle![0]).toContain('type="button"');
  });

  // Browsers key password-manager behaviour off autoComplete, and the caller's
  // styling has to survive, so both must pass straight through.
  it("passes the caller's props through to the field", () => {
    const html = renderToStaticMarkup(
      <PasswordInput className="my-input" placeholder="Current password" autoComplete="current-password" required />,
    );
    // Case-insensitive: React 19 emits the prop as-is (`autoComplete`), and HTML
    // attribute names are case-insensitive, so the browser honours it either way.
    expect(html.toLowerCase()).toContain('autocomplete="current-password"');
    expect(html).toContain('placeholder="Current password"');
    expect(html).toContain("my-input");
    expect(html).toContain("required");
  });

  it("reserves room so the value cannot run under the icon", () => {
    const html = renderToStaticMarkup(<PasswordInput className="w-full" />);
    expect(html).toContain("pr-12");
  });

  // A keyboard-only user has the most need to verify what they typed, so the
  // toggle must stay reachable rather than being skipped to save a tab stop.
  it("stays in the tab order", () => {
    const html = renderToStaticMarkup(<PasswordInput />);
    const toggle = /<button[^>]*data-testid="password-toggle"[^>]*>/.exec(html);
    expect(toggle![0]).not.toContain("tabindex");
  });
});
