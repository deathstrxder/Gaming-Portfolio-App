import Image from "next/image";

import { HomeBackdrop } from "@/components/site/HomeBackdrop";
import { PixelReveal } from "@/components/site/PixelReveal";
import { SocialLinks } from "@/components/site/SocialLinks";
import { EddieTitle } from "@/components/site/EddieTitle";
import { IntroBar } from "@/components/site/IntroBar";

export function EddieHome() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-start overflow-hidden bg-[#06091a] lg:items-center"
    >
      {/* Background sits in place; the pixel curtain over it dissolves bottom-to-top
          to reveal it once the loading bar finishes. */}
      <HomeBackdrop />
      <PixelReveal />

      {/* Social buttons (YouTube + Discord) — blink into existence during the reveal. */}
      <div className="intro-blink">
        <SocialLinks />
      </div>

      {/* Self-portrait — its bottom-right corner sits in the bottom-right corner of the
          screen. Blinks in just after the social icons' first blink (intro-blink-2 is delayed).
          Shorter on small screens so it stays in the lower area and clears the top-anchored
          title (see the title's responsive top padding below). */}
      <div className="intro-blink-2 pointer-events-none absolute bottom-0 right-0 aspect-[3/4] h-[46vh] max-w-[80vw] sm:h-[60vh] lg:h-[82vh] lg:max-w-[92vw]">
        <Image
          src="/gaming/portrait.png"
          alt="Eddie Zeng"
          fill
          sizes="(max-width: 1024px) 92vw, 45vw"
          className="object-cover object-bottom [filter:drop-shadow(0_0_22px_rgba(34,211,238,0.55))_drop-shadow(0_0_48px_rgba(176,0,255,0.4))]"
          priority
        />
      </div>

      {/* Identity — left side. The heading types out while the bar loads beneath it.
          On small screens it's anchored near the top (the section is items-start) so it
          sits above the portrait; on lg it's vertically centered as before. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[88rem] items-center px-6 pb-16 pt-28 sm:px-10 lg:py-20">
        <div className="relative">
          <EddieTitle />
          <IntroBar />
        </div>
      </div>
    </section>
  );
}
