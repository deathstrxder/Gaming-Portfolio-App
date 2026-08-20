import { AuthPanel } from "@/components/site/support/AuthPanel";

export function SupportMe() {
  return (
    <section
      id="support"
      className="mx-auto flex min-h-screen w-full max-w-[120rem] flex-col justify-center px-6 py-24 sm:px-10"
    >
      {/* Rendered statically (NOT scroll-revealed) on purpose: this block hosts the
          auth panel, and a form that fades and slides while a visitor reaches for it
          is a UX loss — plus the auth e2e flows depend on it being immediately
          interactable. (Historically it was also the bottom of the page, where a
          scroll-linked reveal feeds back through the IntersectionObserver band and
          jitters — the STEM resume section below now occupies that spot, with a
          one-shot primitive built for it.) */}
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
