import type { CSSProperties, ReactNode } from "react";

import { RESUME_META } from "@/lib/resume";

/** One labeled cell of the title block strip. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted">
        {label}
      </span>
      {/* break-words: the email is one unbreakable token wider than a half-width
          cell at phone sizes; without this it runs under the neighboring cell. */}
      <span className="break-words font-mono text-sm text-ink">{children}</span>
    </div>
  );
}

/** A crosshair registration mark, as printed on PCBs and drawing corners. */
function Fiducial({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 8 8"
      aria-hidden
      className={`absolute h-2 w-2 text-neon-blue/60 ${className}`}
    >
      <path d="M4 0v8M0 4h8" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

/**
 * The signature element: an engineering drawing's title block. The frame is an
 * SVG rect that draws itself in (`.tb-draw`, globals.css — 900ms, starting
 * 100ms after the block lands) when the enclosing RevealOnce fires; the
 * fiducials and the cell strip ride a second stagger step (--stagger-i: 3 →
 * 210ms) so the pen plot leads and the data follows. The cells carry the
 * document metadata a real title block would — name/role, drawing number,
 * revision, date — plus the two links this section offers (the PDF itself and
 * email). No other links exist on purpose: the PDF lists none, and the
 * section invents nothing.
 */
export function TitleBlock() {
  return (
    <div className="ronce-item relative" style={{ "--stagger-i": 0 } as CSSProperties}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <rect
          x="0.25"
          y="0.5"
          width="99.5"
          height="99"
          fill="none"
          stroke="rgba(34, 211, 238, 0.4)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          className="tb-draw"
        />
      </svg>

      {/* Second stagger step: fiducials + cells arrive at 210ms, after the
          frame has started drawing. `relative` keeps the fiducials anchored to
          this box (which fills the block), and nesting ronce-items is fine —
          each reads its own --stagger-i. */}
      <div className="ronce-item relative" style={{ "--stagger-i": 3 } as CSSProperties}>
        <Fiducial className="-left-3 -top-3" />
        <Fiducial className="-right-3 -top-3" />
        <Fiducial className="-bottom-3 -left-3" />
        <Fiducial className="-bottom-3 -right-3" />

        <div className="grid grid-cols-2 divide-x divide-neon-blue/15 bg-bg-elev/60 sm:grid-cols-3 lg:grid-cols-6">
          <Cell label="Name">
            {RESUME_META.name}
            <span className="block text-muted">{RESUME_META.role}</span>
          </Cell>
          <Cell label="Doc">{RESUME_META.docCode}</Cell>
          <Cell label="Rev">{RESUME_META.revision}</Cell>
          <Cell label="Date">{RESUME_META.date}</Cell>
          <Cell label="Contact">
            <a
              href={`mailto:${RESUME_META.email}`}
              className="underline decoration-neon-blue/40 underline-offset-4 transition-colors hover:text-neon-blue"
            >
              {RESUME_META.email}
            </a>
          </Cell>
          <Cell label="File">
            <a
              href={RESUME_META.pdfHref}
              download
              className="underline decoration-neon-blue/40 underline-offset-4 transition-colors hover:text-neon-blue"
            >
              PDF ↓
            </a>
          </Cell>
        </div>
      </div>
    </div>
  );
}
