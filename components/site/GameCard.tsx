import Image from "next/image";

import type { Game } from "@/lib/games";
import { Reveal } from "@/components/site/Reveal";
import { Card, CardContent } from "@/components/ui/card";

type Direction = "left" | "right" | "up";

export function GameCard({
  game,
  from = "left",
  exit = "origin",
}: {
  game: Game;
  from?: Direction;
  exit?: "origin" | "through";
}) {
  return (
    <Reveal from={from} exit={exit} className="h-full">
      <Card className="hud-corners group h-full min-h-[32rem] lg:min-h-[78vh]">
        {/* Splash art: blurred + faded so it sets mood without fighting the text */}
        <div className="absolute inset-0">
          <Image
            src={game.splash}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={game.splashPosition ? { objectPosition: game.splashPosition } : undefined}
            className="transform-gpu scale-110 object-cover opacity-45 blur-[5px] transition-all duration-500 group-hover:opacity-60"
          />
          {/* Bottom-weighted scrim: art stays visible up top, bullets stay readable below */}
          <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/65 to-bg/90" />
        </div>

        <CardContent className="flex h-full flex-col gap-8 p-10">
          <div className="relative h-24 w-full">
            <Image
              src={game.logo}
              alt={game.name}
              fill
              sizes="360px"
              className={`object-contain object-left drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)] ${
                game.logoInvert ? "brightness-0 invert" : ""
              }`}
            />
          </div>

          <ul className="flex flex-col gap-5">
            {game.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-3 font-body text-xl leading-snug text-ink/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.9)]"
              >
                <span className="mt-2 h-2 w-2 flex-none rotate-45 bg-neon-blue shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Reveal>
  );
}
