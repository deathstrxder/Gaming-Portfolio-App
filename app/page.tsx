import { Fragment } from "react";

import { SECTION_GROUPS, YOUTUBE_URL } from "@/lib/games";
import { EddieHome } from "@/components/site/EddieHome";
import { MostPlayed } from "@/components/site/MostPlayed";
import { GameSection } from "@/components/site/GameSection";
import { Timeline } from "@/components/site/Timeline";
import { Reveal } from "@/components/site/Reveal";
import { NavBar } from "@/components/site/NavBar";

/** Maps each game-showcase group to the nav anchor id on its section. */
const GAME_SECTION_ANCHORS: Record<string, string> = {
  supercell: "supercell",
  competitive: "riot",
  sandbox: "other",
};

function Divider() {
  return (
    <div className="mx-auto max-w-[120rem] px-6 sm:px-10">
      <div className="h-px bg-gradient-to-r from-transparent via-neon-blue/30 to-transparent" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative overflow-x-hidden">
      <NavBar />
      <EddieHome />
      <Divider />
      <MostPlayed />
      {SECTION_GROUPS.map((group) => (
        <Fragment key={group.id}>
          <Divider />
          <GameSection id={GAME_SECTION_ANCHORS[group.id]} games={group.games} />
        </Fragment>
      ))}
      <Divider />
      {/* The anchor id lives on this static wrapper, not on the Reveal-transformed
          section — otherwise a nav click scrolls to the section's translated (pre-
          reveal) position, overshooting and dragging the footer into view. */}
      <div id="timeline">
        <Reveal from="up">
          <Timeline />
        </Reveal>
      </div>

      {/* Footer sits at the very bottom, where there isn't enough scroll room to
          fully reveal a scroll-linked element, so it stays statically visible. */}
      <footer className="border-t border-white/10 py-14 text-center">
        <a
          href={YOUTUBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-base uppercase tracking-[0.25em] text-muted transition-colors hover:text-neon-blue"
        >
          @deathstrxder
        </a>
        <p className="mt-3 font-body text-base text-muted/70">
          Eddie Zeng · Amateur Gamer
        </p>
      </footer>
    </main>
  );
}
