"use client";

import Image from "next/image";

import type { Game } from "@/lib/games";
import { cn } from "@/lib/utils";

// Regular pentagon with a vertex at the +X (right) edge — matches the face
// tangent used in lib/dodecahedron.ts so the pentagons tile.
const PENTAGON_CLIP =
  "polygon(100% 50%, 65.45% 97.55%, 9.55% 79.39%, 9.55% 20.61%, 65.45% 2.45%)";

export function DodecahedronFace({
  game,
  iconSrc,
  transform,
  sizePx,
  focused,
  onEnter,
  onClickFace,
}: {
  game: Game;
  iconSrc: string;
  transform: string;
  sizePx: number;
  focused: boolean;
  onEnter: () => void;
  onClickFace: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: sizePx,
        height: sizePx,
        marginLeft: -sizePx / 2,
        marginTop: -sizePx / 2,
        transform,
        backfaceVisibility: "hidden",
      }}
    >
      <a
        href={`#game-${game.id}`}
        aria-label={`Jump to ${game.name}`}
        onPointerEnter={onEnter}
        onClick={onClickFace}
        className={cn(
          "relative block h-full w-full bg-bg-elev/60 transition-[filter] duration-300",
          focused ? "brightness-125" : "brightness-100",
        )}
        style={{ clipPath: PENTAGON_CLIP }}
      >
        {/* Icon fills the whole face and is cropped to the pentagon by clipPath. */}
        <Image src={iconSrc} alt={game.name} fill sizes="150px" className="object-cover" />
      </a>
    </div>
  );
}
