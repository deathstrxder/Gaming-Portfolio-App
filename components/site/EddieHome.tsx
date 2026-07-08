import Image from "next/image";

import { Intro } from "@/components/site/Intro";
import { HomeBackdrop } from "@/components/site/HomeBackdrop";
import { SocialLinks } from "@/components/site/SocialLinks";

export function EddieHome() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <HomeBackdrop />

      {/* Social buttons (YouTube + Discord) — top-right corner of the home page */}
      <SocialLinks />

      <div className="relative z-10 mx-auto grid w-full max-w-[88rem] grid-cols-1 items-center gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[auto_1fr] lg:gap-16">
        {/* Left: identity */}
        <Intro from="left" delay={0.3}>
          <p className="eyebrow text-base text-neon-blue/80 sm:text-lg">
            Playing games since 2013
          </p>
          <h1 className="mt-6 whitespace-nowrap font-display text-[3.4rem] font-black leading-[0.95] tracking-tight text-ink sm:text-[4.1rem] lg:text-[5.45rem]">
            <span className="text-glow-blue">Eddie</span>{" "}
            <span className="text-glow-blue">Zeng</span>
            <span className="text-neon-purple">:</span>
          </h1>
          <div className="mt-8 flex items-center gap-5">
            <span className="h-0.5 w-16 bg-gradient-to-r from-neon-blue to-neon-purple sm:w-24" />
            <p className="whitespace-nowrap bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text font-display text-4xl font-bold uppercase tracking-[0.15em] text-transparent sm:text-5xl lg:text-6xl">
              Amateur Gamer
            </p>
          </div>
        </Intro>

        {/* Right: transparent self-portrait cut-out floating with a neon silhouette halo */}
        <Intro from="right" delay={0.8} className="flex justify-center">
          <div className="relative aspect-[3/4] w-full max-w-[31rem] sm:max-w-[37rem] lg:max-w-[46rem]">
            <Image
              src="/gaming/portrait.png"
              alt="Eddie Zeng"
              fill
              sizes="(max-width: 768px) 31rem, (max-width: 1024px) 37rem, 46rem"
              className="object-contain [filter:drop-shadow(0_0_22px_rgba(34,211,238,0.55))_drop-shadow(0_0_48px_rgba(176,0,255,0.4))]"
              priority
            />
          </div>
        </Intro>
      </div>
    </section>
  );
}
