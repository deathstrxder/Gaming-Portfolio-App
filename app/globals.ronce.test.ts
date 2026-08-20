import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * String-level contract for the one-shot entrance family (`.ronce*`) the resume
 * section rides on. These are the invariants that strand content invisible when
 * broken, which no type-checker or visual diff reports: the reduced-motion
 * override, the no-JS rescue, and the spec's exact motion numbers.
 */
const css = readFileSync("app/globals.css", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");

describe("ronce entrance contract", () => {
  it("hides items only until .is-in, with the spec's exact motion numbers", () => {
    expect(css).toContain(".ronce-item");
    expect(css).toContain("translate3d(0, 24px, 0)");
    expect(css).toMatch(/\.ronce\.is-in \.ronce-item[\s\S]*?opacity: 1/);
    expect(css).toContain("640ms cubic-bezier(0.22, 1, 0.36, 1)");
    expect(css).toContain("calc(var(--stagger-i, 0) * 70ms)");
  });

  it("forces items visible under prefers-reduced-motion", () => {
    // Content-based lookup, not positional: the ronce overrides live in their
    // own reduced-motion block wherever it sits in the file. The tempered
    // pattern ((?:(?!@media)[\s\S])*?) cannot cross into a LATER media block,
    // so a .ronce-item mentioned there cannot satisfy it. (It can still walk
    // out of the block into top-level rules before the next @media — a
    // hoisted-rule false pass this test tolerates; the full-motion e2e is the
    // backstop that the real media block actually does its job.)
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{(?:(?!@media)[\s\S])*?\.ronce-item(?:(?!@media)[\s\S]){0,200}?opacity: 1 !important/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{(?:(?!@media)[\s\S])*?\.tb-draw(?:(?!@media)[\s\S]){0,200}?stroke-dashoffset: 0 !important/,
    );
  });

  it("rescues no-JS visitors through the layout noscript style", () => {
    expect(layout).toContain(".ronce-item{opacity:1!important;transform:none!important}");
    expect(layout).toContain(".tb-draw{stroke-dashoffset:0!important}");
  });

  it("registers the mono font token so font-mono is IBM Plex Mono", () => {
    expect(css).toContain("--font-mono: var(--font-plex-mono);");
    expect(layout).toContain("IBM_Plex_Mono");
    expect(layout).toContain("--font-plex-mono");
  });
});
