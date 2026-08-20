import type { CSSProperties, ReactNode } from "react";

/**
 * One datasheet panel: hairline border, opaque elevated ground, and a header
 * row of reference designator + title, set in the section's mono/engineering
 * voice. The panel itself is a `.ronce-item` (it rises as one block); list
 * content inside it adds further `.ronce-item`s with higher --stagger-i so a
 * panel's rows land after its frame, Apple-style.
 *
 * Each panel sits in its own RevealOnce, so its stagger index is always 0 —
 * its rows start from 1.
 */
export function SpecPanel({
  designator,
  title,
  children,
}: {
  designator: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article
      className="ronce-item relative rounded-lg border border-neon-blue/20 bg-bg-elev p-6 sm:p-8"
      style={{ "--stagger-i": 0 } as CSSProperties}
    >
      <header className="flex items-baseline gap-3 border-b border-neon-blue/15 pb-3">
        <span className="border border-neon-blue/40 px-1.5 py-0.5 font-mono text-xs font-medium tracking-widest text-neon-blue">
          {designator}
        </span>
        <h3 className="font-body text-lg font-semibold uppercase tracking-[0.2em] text-ink">
          {title}
        </h3>
      </header>
      <div className="pt-5">{children}</div>
    </article>
  );
}
