import Image from "next/image";

import { ALL_GAMES, STATS } from "@/lib/games";
import { Reveal } from "@/components/site/Reveal";
import { Card, CardContent } from "@/components/ui/card";

export function MostPlayed() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-28 sm:px-10">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* Left: heading + icon grid */}
        <Reveal from="left">
          <h2 className="font-display text-5xl font-bold tracking-tight text-ink text-glow-blue sm:text-6xl">
            Most Played Games
          </h2>

          <ul className="mt-12 grid max-w-xl grid-cols-3 gap-5 sm:gap-6">
            {ALL_GAMES.map((game, i) => (
              <li
                key={game.id}
                className={i === ALL_GAMES.length - 1 ? "col-start-2" : undefined}
              >
                <a
                  href={`#game-${game.id}`}
                  aria-label={`Jump to ${game.name}`}
                  className="hud-corners group relative flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-bg-elev/60 transition-all duration-200 hover:-translate-y-1 hover:border-neon-blue/50 hover:box-glow-blue"
                >
                  <div className="relative h-full w-full p-5">
                    <Image
                      src={game.icon}
                      alt={game.name}
                      fill
                      sizes="160px"
                      className="object-contain transition-transform duration-200 group-hover:scale-110"
                    />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Right: headline stats */}
        <Reveal from="right" className="flex flex-col gap-8">
          {STATS.map((stat, i) => (
            <Card
              key={stat.big}
              className={`hud-corners ${i % 2 === 0 ? "box-glow-blue" : "box-glow-purple"}`}
            >
              <CardContent className="p-10">
                <p
                  className={`font-display text-5xl font-black tracking-tight sm:text-6xl ${
                    i % 2 === 0
                      ? "text-neon-blue text-glow-blue"
                      : "text-neon-purple text-glow-purple"
                  }`}
                >
                  {stat.big}
                </p>
                <p className="mt-3 font-body text-xl uppercase tracking-[0.15em] text-muted">
                  {stat.small}
                </p>
              </CardContent>
            </Card>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
