import { STATS } from "@/lib/games";
import { buildFaceAssignments } from "@/lib/dodecahedron";
import { Dodecahedron } from "@/components/site/Dodecahedron";
import { Reveal } from "@/components/site/Reveal";
import { Card, CardContent } from "@/components/ui/card";

export function MostPlayed() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-28 sm:px-10">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* Left: heading + interactive dodecahedron of game icons, centered as
            one aligned stack */}
        <div className="flex flex-col items-center text-center">
          <Reveal from="left">
            <h2 className="font-display text-5xl font-bold tracking-tight text-ink text-glow-blue sm:text-6xl">
              Most Played Games
            </h2>
          </Reveal>
          <div className="mt-10 w-full">
            <Dodecahedron faces={buildFaceAssignments()} />
          </div>
        </div>

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
