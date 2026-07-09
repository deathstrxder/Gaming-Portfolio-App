"use client";

import Image from "next/image";

import type { Game } from "@/lib/games";
import { cn } from "@/lib/utils";

// Regular pentagon with a vertex at the top — matches the vertex-up face frame
// in lib/dodecahedron.ts so the pentagons tile AND the upright icon is left/
// right symmetric within the pentagon. The same coordinates drive the clip-path
// (percent units) and the SVG edge overlay (viewBox 0..100 units).
const PENTAGON_POINTS = "50,0 97.55,34.55 79.39,90.45 20.61,90.45 2.45,34.55";
const PENTAGON_CLIP =
  "polygon(50% 0%, 97.55% 34.55%, 79.39% 90.45%, 20.61% 90.45%, 2.45% 34.55%)";

export function DodecahedronFace({
  game,
  iconSrc,
  transform,
  sizePx,
  focused,
  pressed = false,
  popPx = 0,
  hoverExplodePx = 0,
  hoverActive = false,
  dimmed = false,
  innerRef,
  onEnter,
  onClickFace,
}: {
  game: Game;
  iconSrc: string;
  transform: string;
  sizePx: number;
  focused: boolean;
  pressed?: boolean;
  popPx?: number;
  hoverExplodePx?: number;
  hoverActive?: boolean;
  dimmed?: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
  onEnter: () => void;
  onClickFace: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      ref={innerRef}
      className="absolute left-1/2 top-1/2"
      style={{
        width: sizePx,
        height: sizePx,
        marginLeft: -sizePx / 2,
        marginTop: -sizePx / 2,
        // Pop the hovered face outward along its normal (local +Z). The
        // translateZ(0) baseline keeps both transform lists the same shape so
        // the pop transitions smoothly. No backface-visibility: back faces stay
        // rendered (faded via per-face opacity) so the interior is visible.
        // While any face is hovered, push every face out a bit more (bigger
        // gaps) so the hovered one stands out; the hovered face also pops.
        transform: `${transform} translateZ(${
          (hoverActive ? hoverExplodePx : 0) + (focused && !pressed ? popPx : 0)
        }px)`,
        transition: "transform 300ms ease",
      }}
    >
      <a
        href={`#game-${game.id}`}
        aria-label={`Jump to ${game.name}`}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onPointerEnter={onEnter}
        onClick={onClickFace}
        className={cn(
          "absolute inset-0 block select-none bg-bg-elev/60 transition-[filter] duration-300",
          focused ? "brightness-150" : dimmed ? "brightness-50" : "brightness-100",
        )}
        style={{ clipPath: PENTAGON_CLIP }}
      >
        {/* Icon fills the whole face and is cropped to the pentagon by clipPath. */}
        <Image
          src={iconSrc}
          alt={game.name}
          fill
          draggable={false}
          sizes="200px"
          className="select-none object-cover"
        />
      </a>
      {/* Neon pentagon edge, over the icon but not clipped so the full stroke
          shows. Two stacked strokes fake a glow without CSS filters, which can
          break backface-visibility inside a 3D transform. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <polygon
          points={PENTAGON_POINTS}
          fill="none"
          stroke="rgba(34, 211, 238, 0.35)"
          strokeWidth={focused ? 6 : 4}
          strokeLinejoin="round"
        />
        <polygon
          points={PENTAGON_POINTS}
          fill="none"
          stroke={focused ? "#8af1ff" : "#22d3ee"}
          strokeWidth={focused ? 2.4 : 1.4}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
