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
      className="relative flex min-h-screen items-center overflow-hidden bg-[#06091a]"
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
          screen. Blinks in just after the social icons' first blink (intro-blink-2 is delayed). */}
      <div className="intro-blink-2 pointer-events-none absolute bottom-0 right-0 aspect-[3/4] h-[58vh] max-w-[92vw] sm:h-[70vh] lg:h-[82vh]">
        <Image
          src="/gaming/portrait.png"
          alt="Eddie Zeng"
          fill
          sizes="(max-width: 1024px) 92vw, 45vw"
          className="object-cover object-bottom [filter:drop-shadow(0_0_22px_rgba(34,211,238,0.55))_drop-shadow(0_0_48px_rgba(176,0,255,0.4))]"
          priority
        />
      </div>

      {/* Identity — left side. The heading types out while the bar loads beneath it. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[88rem] items-center px-6 py-20 sm:px-10">
        <div className="relative">
          <EddieTitle />
          <IntroBar />
        </div>
      </div>
    </section>
  );
}
