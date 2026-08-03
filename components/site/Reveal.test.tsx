import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Reveal } from "@/components/site/Reveal";

/**
 * These lock in the one structural invariant the reveal animation depends on: the
 * element the IntersectionObserver measures must not be an element the animation
 * moves.
 *
 * An IntersectionObserver reports the *transformed* box. When the observed element
 * is also the transformed one, a reveal leaving toward "origin" from "up" is pushed
 * 120px back down into the band it just left, which marks it visible, which drops
 * the transform, which pushes it out of the band again — a frame-rate oscillation
 * that reads as violent jitter while scrolling past the section. The static
 * `.reveal-root` wrapper is what breaks that loop, so collapsing it back into the
 * moving element must fail loudly here.
 */
const rootTagOf = (html: string) => html.slice(0, html.indexOf(">") + 1);

describe("Reveal", () => {
  it("observes a wrapper that carries no offsets and no motion classes", () => {
    const html = renderToStaticMarkup(<Reveal from="up">clip</Reveal>);

    // Exactly this — no style, no `reveal`/`reveal-slide`, nothing that transforms.
    expect(rootTagOf(html)).toBe('<div class="reveal-root">');
    expect(html).toContain("--enter"); // the offsets live on the child that moves
  });

  it("keeps the offsets and motion classes on the child, both with and without a backdrop", () => {
    const plain = renderToStaticMarkup(<Reveal from="up">clip</Reveal>);
    const withBackdrop = renderToStaticMarkup(
      <Reveal from="up" backdrop="rounded-xl bg-bg">
        clip
      </Reveal>,
    );

    for (const html of [plain, withBackdrop]) {
      const insideWrapper = html.slice(rootTagOf(html).length);
      expect(rootTagOf(html)).not.toContain("--");
      expect(insideWrapper).toContain("--leave");
    }
    expect(plain).toContain('class="reveal ');
    expect(withBackdrop).toContain('class="reveal-slide relative');
  });

  it("puts a caller's className on the children's parent, not on the observed wrapper", () => {
    // MostPlayed passes layout classes that must apply to the element the children
    // actually sit in, or its flex column collapses.
    const html = renderToStaticMarkup(
      <Reveal from="right" className="flex flex-col gap-10">
        stat
      </Reveal>,
    );

    expect(rootTagOf(html)).toBe('<div class="reveal-root">');
    expect(html).toContain("flex flex-col gap-10");
  });
});
