import { Typed } from "@/components/site/Typed";

/**
 * The home Eddie's identity block — eyebrow, the "Eddie Zeng:" heading, and the
 * "Amateur Gamer" gradient line. All three type out (staggered) while the loading
 * bar runs; the aria-labels keep them readable to screen readers.
 */
export function EddieTitle({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p
        className="eyebrow text-base text-neon-blue/80 sm:text-lg"
        aria-label="Playing games since 2013"
      >
        <Typed segments={[{ text: "Playing games since 2013" }]} delay={0} />
      </p>
      <h1
        className="mt-6 whitespace-nowrap font-display text-[3.4rem] font-black leading-[0.95] tracking-tight text-ink sm:text-[4.1rem] lg:text-[5.45rem]"
        aria-label="Eddie Zeng:"
      >
        <Typed
          segments={[
            { text: "Eddie", className: "text-glow-blue" },
            { text: " " },
            { text: "Zeng", className: "text-glow-blue" },
            { text: ":", className: "text-neon-purple" },
          ]}
          delay={900}
        />
      </h1>
      <div className="mt-8 flex items-center gap-5">
        <span className="h-0.5 w-16 bg-gradient-to-r from-neon-blue to-neon-purple sm:w-24" />
        <p
          className="whitespace-nowrap bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text font-display text-4xl font-bold uppercase tracking-[0.15em] text-transparent sm:text-5xl lg:text-6xl"
          aria-label="Amateur Gamer"
        >
          <Typed segments={[{ text: "Amateur Gamer" }]} delay={1350} />
        </p>
      </div>
    </div>
  );
}
