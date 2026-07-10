import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";

import { IntroProvider } from "@/components/site/IntroContext";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

export const metadata: Metadata = {
  title: "Eddie Zeng — Amateur Gamer",
  description:
    "The gaming portfolio of Eddie Zeng: most-played games, lifetime stats, and a timeline of every game picked up since 2013.",
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
      className={`${orbitron.variable} ${rajdhani.variable} h-full antialiased`}
    >
      <body className="min-h-full" suppressHydrationWarning>
        <IntroProvider>{children}</IntroProvider>
        {/* No-JS: the intro can't play, so show EddieHome as-is and drop the bar. */}
        <noscript>
          <style>{`.intro-bar{display:none!important}[data-intro-phase="loading"] .intro-flyup,[data-intro-phase="loading"] .intro-blink{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </body>
    </html>
  );
}
