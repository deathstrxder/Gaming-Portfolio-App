import type { Game } from "@/lib/games";
import { GameCard } from "@/components/site/GameCard";

export function GameSection({ games }: { games: Game[] }) {
  const cols = games.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-[120rem] flex-col justify-center px-6 py-16 sm:px-10">
      <div className={`grid grid-cols-1 gap-8 ${cols}`}>
        {games.map((game, i) => {
          // Per-game entrance overrides; every other card alternates sides and drifts
          // back the way it came. Clash Royale enters from the bottom and passes
          // through (out the top scrolling down, out the bottom scrolling up); Brawl
          // Stars enters from the right.
          const isClashRoyale = game.id === "clash-royale";
          const from = isClashRoyale
            ? "up"
            : game.id === "brawl-stars"
              ? "right"
              : i % 2 === 0
                ? "left"
                : "right";
          return (
            <div key={game.id} id={`game-${game.id}`} className="scroll-mt-24">
              <GameCard
                game={game}
                from={from}
                exit={isClashRoyale ? "through" : "origin"}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
