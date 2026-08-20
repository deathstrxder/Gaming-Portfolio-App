import type { Metadata } from "next";
import { IBM_Plex_Mono, Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";

import { IntroProvider } from "@/components/site/IntroContext";
import { SectionStreaks } from "@/components/site/SectionStreaks";
import { Analytics } from "@/components/site/Analytics";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Eddie Zeng — Amateur Gamer",
  description:
    "The gaming portfolio of Eddie Zeng: most-played games, lifetime stats, a timeline of his favorite games picked up since 2013 — and his STEM resume.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-intro-phase="loading"
      className={`${orbitron.variable} ${rajdhani.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full" suppressHydrationWarning>
        {/* Decorative diagonal neon streaks behind the non-home sections — pure-CSS,
            compositor-only motion (no GIF, no main-thread cost, so it can't cause the
            scroll lag the GIF did). The opaque hero covers it; the home hero keeps its
            own GIF backdrop via HomeBackdrop. */}
        <SectionStreaks />
        <Analytics />
        <IntroProvider>{children}</IntroProvider>
        {/* No-JS: the intro can't play, so show EddieHome as-is and drop the bar. */}
        <noscript>
          <style>{`.intro-bar{display:none!important}.pixel-curtain{display:none!important}[data-intro-phase="loading"] .intro-blink{opacity:1!important;transform:none!important}.reveal,.reveal-slide,.reveal-fade{opacity:1!important;transform:none!important}.ronce-item{opacity:1!important;transform:none!important}.tb-draw{stroke-dashoffset:0!important}`}</style>
        </noscript>
      </body>
    </html>
  );
}
