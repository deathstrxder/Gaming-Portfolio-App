import { STATS } from "@/lib/games";
import { buildFaceAssignments } from "@/lib/dodecahedron";
import { Dodecahedron } from "@/components/site/Dodecahedron";
import { Reveal } from "@/components/site/Reveal";
import { Card, CardContent } from "@/components/ui/card";

export function MostPlayed() {
  return (
    <section
      id="most-played"
      className="mx-auto flex min-h-screen w-full max-w-[120rem] flex-col justify-center px-6 pb-16 pt-24 sm:px-10"
    >
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* Left: heading + interactive dodecahedron of game icons, centered as
            one aligned stack */}
        <div className="flex flex-col items-center text-center">
          <Reveal from="left">
            <h2 className="font-display text-6xl font-bold tracking-tight text-ink text-glow-blue sm:text-7xl">
              Most Played Games
            </h2>
          </Reveal>
          <div className="mt-12 w-full" data-analytics-dodecahedron>
            <Dodecahedron faces={buildFaceAssignments()} />
          </div>
        </div>

        {/* Right: headline stats */}
        <Reveal from="right" className="flex flex-col gap-10">
          {STATS.map((stat, i) => (
            <Card
              key={stat.big}
              className={`hud-corners ${i % 2 === 0 ? "box-glow-blue" : "box-glow-purple"}`}
            >
              <CardContent className="p-12">
                <p
                  className={`font-display text-6xl font-black tracking-tight sm:text-7xl ${
                    i % 2 === 0
                      ? "text-neon-blue text-glow-blue"
                      : "text-neon-purple text-glow-purple"
                  }`}
                >
                  {stat.big}
                </p>
                <p className="mt-4 font-body text-2xl uppercase tracking-[0.15em] text-muted">
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
