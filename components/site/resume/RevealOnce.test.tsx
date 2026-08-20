import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RevealOnce } from "@/components/site/resume/RevealOnce";

/**
 * Same structural invariant Reveal.test.tsx locks for the bidirectional
 * primitive: the element the IntersectionObserver measures must never be an
 * element the animation moves. RevealOnce disconnects after the first
 * intersection, so a feedback loop cannot oscillate — but an observed box
 * that starts 24px displaced would still mis-measure the first crossing.
 */
const rootTagOf = (html: string) => html.slice(0, html.indexOf(">") + 1);

describe("RevealOnce", () => {
  it("observes a wrapper with no motion classes and no offsets", () => {
    const html = renderToStaticMarkup(
      <RevealOnce>
        <p className="ronce-item">row</p>
      </RevealOnce>,
    );
    expect(rootTagOf(html)).toBe('<div class="ronce-root">');
  });

  it("server-renders WITHOUT is-in so the entrance can play after hydration", () => {
    const html = renderToStaticMarkup(<RevealOnce>x</RevealOnce>);
    expect(html).not.toContain("is-in");
    expect(html).toContain('class="ronce"');
  });

  it("puts a caller className on the OBSERVED ROOT — grid placement must bind to the grid item", () => {
    // Callers pass `lg:col-span-*`; the grid item is the root. A span class on
    // the inner div would be inert and the desktop grid would collapse into
    // twelve auto-placed slivers. Layout classes on the root are safe — the
    // root invariant above is about motion classes and offsets, never layout.
    const html = renderToStaticMarkup(
      <RevealOnce className="lg:col-span-7">x</RevealOnce>,
    );
    expect(rootTagOf(html)).toBe('<div class="ronce-root lg:col-span-7">');
    expect(html).toContain('class="ronce"');
  });
});
