import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ResumeSection } from "@/components/site/resume/ResumeSection";
import { ROBOTICS } from "@/lib/resume";

const html = renderToStaticMarkup(<ResumeSection />);

describe("ResumeSection", () => {
  it("anchors #stem-resume on the static section and fills the viewport for the scroll-spy", () => {
    // NavBar's spy band is the middle 10% of the viewport; a short section
    // would never highlight (see the -45% rootMargin in NavBar.tsx).
    expect(html).toContain('id="stem-resume"');
    expect(html).toContain("min-h-screen");
  });

  it("renders every datasheet panel designator", () => {
    for (const d of ["A1", "B1", "C1", "C2", "D1", "E1"]) {
      expect(html).toContain(`${d}<`);
    }
  });

  it("renders all six awards", () => {
    for (const name of ROBOTICS.awards.flatMap((a) => a.names)) {
      expect(html).toContain(name);
    }
  });

  it("links the PDF download and the email, and nothing else external", () => {
    expect(html).toContain('href="/eddie-zeng-stem-resume.pdf"');
    expect(html).toContain('href="mailto:eddie.y.zeng@gmail.com"');
    expect(html).not.toMatch(/href="https?:/);
  });

  it("never leaks a phone-shaped digit run or tel: link into the markup", () => {
    // Leak-free by design: matches the shape of a phone number (10 digits, at
    // most two separator chars between digits), never the number itself.
    expect(html).not.toMatch(/(?:\d[\s.()-]{0,2}){9}\d/);
    expect(html).not.toContain('href="tel:');
  });

  it("speaks the datasheet language, not the gamer language", () => {
    // The spec's enforceable review rule: none of the three glow families, no Orbitron.
    expect(html).not.toContain("text-glow-");
    expect(html).not.toContain("box-glow");
    expect(html).not.toContain("hud-corners");
    expect(html).not.toContain("font-display");
    // And the animation grammar is the one-shot family, never the bidirectional one.
    expect(html).toContain("ronce-item");
    expect(html).not.toContain('class="reveal');
  });

  it("keeps position:sticky out (overflow-x-hidden on <main> silently disables it)", () => {
    expect(html).not.toContain("sticky");
  });
});
