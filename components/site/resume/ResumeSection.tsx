import type { CSSProperties, ReactNode } from "react";

import {
  EDUCATION,
  PROGRAMS,
  PROJECTS,
  RESUME_HEADLINE,
  ROBOTICS,
  SKILLS,
} from "@/lib/resume";
import { RevealOnce } from "@/components/site/resume/RevealOnce";
import { SpecPanel } from "@/components/site/resume/SpecPanel";
import { TitleBlock } from "@/components/site/resume/TitleBlock";

const item = (i: number) => ({ "--stagger-i": i }) as CSSProperties;

// Chip staggers run CONTINUOUSLY across the three skill groups — each group
// starts where the previous ended, so there are no dead slots and the chain
// tops out at index 10 (700ms), inside the spec's 770ms ceiling.
const SKILL_OFFSETS = SKILLS.groups.map((_, gi) =>
  SKILLS.groups.slice(0, gi).reduce((n, g) => n + g.items.length, 0),
);

/** A mono chip — machined flat tag, hairline border, no glow. The chip's own
 *  <li> carries the entrance (`ronce-item` + its stagger index): a display:
 *  contents wrapper would generate no box, so opacity/transform on it would be
 *  silently ignored and the chips would never do their per-chip stagger. */
function Chip({ children, stagger }: { children: ReactNode; stagger: number }) {
  return (
    <li
      className="ronce-item border border-neon-blue/25 px-2 py-1 font-mono text-xs text-ink/90"
      style={item(stagger)}
    >
      {children}
    </li>
  );
}

/**
 * The STEM resume, presented as an engineering datasheet — deliberately a
 * different dialect from the neon arcade sections above it: opaque graph-paper
 * ground (`.blueprint` covers the fixed washes, grid, and streaks), hairline
 * strokes, mono annotations, reference designators, and not a single glow.
 * Orbitron (`font-display`) is deliberately absent; Rajdhani carries display
 * duty here. Everything animates with the one-shot `.ronce` family — this is
 * the bottom of the page, where the bidirectional band observer jitters (see
 * Reveal.tsx), and Apple's grammar is arrive-once anyway.
 *
 * The anchor id lives on the static <section>; only `.ronce-item` descendants
 * ever transform, so a nav click always scrolls to true geometry.
 */
export function ResumeSection() {
  return (
    <section
      id="stem-resume"
      aria-labelledby="stem-resume-title"
      className="blueprint relative min-h-screen w-full border-t border-neon-blue/15 py-24"
    >
      <div className="mx-auto w-full max-w-[120rem] px-6 sm:px-10">
        <RevealOnce>
          <p
            className="ronce-item font-mono text-xs uppercase tracking-[0.35em] text-neon-blue/80"
            style={item(0)}
          >
            {RESUME_HEADLINE.eyebrow}
          </p>
          <h2
            id="stem-resume-title"
            className="ronce-item mt-4 font-body text-5xl font-bold tracking-tight text-ink sm:text-6xl"
            style={item(1)}
          >
            {RESUME_HEADLINE.title}
          </h2>
          <p className="ronce-item mt-4 max-w-2xl font-body text-xl text-muted" style={item(2)}>
            {RESUME_HEADLINE.sub}
          </p>
        </RevealOnce>

        <RevealOnce className="mt-12">
          <TitleBlock />
        </RevealOnce>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <RevealOnce className="lg:col-span-12">
            <SpecPanel designator={ROBOTICS.designator} title={ROBOTICS.title}>
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <ul className="space-y-2">
                    {ROBOTICS.roles.map((r, i) => (
                      <li key={r.role} className="ronce-item" style={item(i + 1)}>
                        <span className="font-body text-2xl font-semibold text-ink">{r.role}</span>
                        <span className="mt-0.5 block font-mono text-xs text-muted">{r.detail}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-6 space-y-2.5">
                    {ROBOTICS.bullets.map((b, i) => (
                      <li
                        key={b}
                        className="ronce-item flex gap-3 font-body text-base text-ink/90"
                        style={item(i + 3)}
                      >
                        <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-neon-blue/60" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className="ronce-item border-l-2 border-neon-purple/60 pl-6"
                  style={item(4)}
                >
                  <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                    Team awards
                  </p>
                  {ROBOTICS.awards.map((season, s) => (
                    <div key={season.season} className="mt-5">
                      <p className="font-mono text-sm text-neon-purple/90">{season.season}</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {season.names.map((name, i) => (
                          <li
                            key={name}
                            className="ronce-item border border-neon-purple/30 px-2 py-1 font-mono text-xs text-ink/90"
                            style={item(5 + s * 3 + i)}
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </SpecPanel>
          </RevealOnce>

          <RevealOnce className="lg:col-span-7">
            <SpecPanel designator={EDUCATION.designator} title={EDUCATION.title}>
              <p className="ronce-item font-body text-2xl font-semibold text-ink" style={item(1)}>
                {EDUCATION.school}
              </p>
              <p className="ronce-item mt-1 font-mono text-xs text-muted" style={item(2)}>
                {EDUCATION.status}
              </p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                    In school
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {EDUCATION.inSchool.map((c, i) => (
                      <li
                        key={c}
                        className="ronce-item font-body text-base text-ink/90"
                        style={item(i + 3)}
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                    Self-studied
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {EDUCATION.selfStudied.map((c, i) => (
                      <li
                        key={c}
                        className="ronce-item font-body text-base text-ink/90"
                        style={item(i + 3)}
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SpecPanel>
          </RevealOnce>

          <RevealOnce className="lg:col-span-5">
            <SpecPanel designator={SKILLS.designator} title={SKILLS.title}>
              <div className="space-y-6">
                {SKILLS.groups.map((g, gi) => (
                  <div key={g.label}>
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                      {g.label}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {g.items.map((s, i) => (
                        <Chip key={s} stagger={SKILL_OFFSETS[gi] + i + 1}>
                          {s}
                        </Chip>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </SpecPanel>
          </RevealOnce>

          {PROJECTS.map((p) => (
            <RevealOnce key={p.title} className="lg:col-span-6">
              <SpecPanel designator={p.designator} title={`Project — ${p.title}`}>
                <p className="ronce-item font-mono text-xs text-muted" style={item(1)}>
                  {p.year}
                </p>
                <p className="ronce-item mt-3 font-body text-lg text-ink/90" style={item(2)}>
                  {p.summary}
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {p.tech.map((t, i) => (
                    <Chip key={t} stagger={i + 3}>
                      {t}
                    </Chip>
                  ))}
                </ul>
              </SpecPanel>
            </RevealOnce>
          ))}

          <RevealOnce className="lg:col-span-12">
            <SpecPanel designator={PROGRAMS.designator} title={PROGRAMS.title}>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {PROGRAMS.items.map((prog, i) => (
                  <li key={prog.name} className="ronce-item" style={item(i + 1)}>
                    <p className="font-body text-lg font-semibold text-ink">{prog.name}</p>
                    {prog.when ? (
                      <p className="mt-1 font-mono text-xs text-muted">{prog.when}</p>
                    ) : null}
                    {prog.detail ? (
                      <p className="mt-2 font-body text-sm text-ink/80">{prog.detail}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </SpecPanel>
          </RevealOnce>
        </div>
      </div>
    </section>
  );
}
