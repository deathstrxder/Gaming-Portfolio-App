import { AuthPanel } from "@/components/site/support/AuthPanel";

export function SupportMe() {
  return (
    <section
      id="support"
      className="mx-auto flex min-h-screen w-full max-w-[120rem] flex-col justify-center px-6 py-24 sm:px-10"
    >
      {/* Rendered statically (NOT scroll-revealed). This section sits directly above
          the footer with no scroll room below it, so a scroll-linked <Reveal> would
          keep crossing the IntersectionObserver band as its own transform moves it —
          a feedback loop that jitters the title up and down. This is the same reason
          the footer stays static (see app/page.tsx). */}
      <div className="mx-auto w-full max-w-xl text-center">
        <h2 className="font-display text-6xl font-bold tracking-tight text-ink text-glow-purple sm:text-7xl">
          Support Me!
        </h2>
        <p className="mt-6 font-body text-xl text-muted">
          Create an account and subscribe to my services to support me in my future endeavors.
        </p>
      </div>
      <div className="mx-auto mt-12 w-full max-w-xl">
        <AuthPanel />
      </div>
    </section>
  );
}
