"use client";

import { memo } from "react";
import Image from "next/image";

import type { Game } from "@/lib/games";

// Regular pentagon with a vertex at the top — matches the vertex-up face frame
// in lib/dodecahedron.ts so the pentagons tile AND the upright icon is left/
// right symmetric within the pentagon. The same coordinates drive the clip-path
// (percent units) and the SVG edge overlay (viewBox 0..100 units).
const PENTAGON_POINTS = "50,0 97.55,34.55 79.39,90.45 20.61,90.45 2.45,34.55";
const PENTAGON_CLIP =
  "polygon(50% 0%, 97.55% 34.55%, 79.39% 90.45%, 20.61% 90.45%, 2.45% 34.55%)";

// Memoized so nothing re-runs next/image after mount.
const FaceIcon = memo(function FaceIcon({
  iconSrc,
  alt,
}: {
  iconSrc: string;
  alt: string;
}) {
  return (
    <Image
      src={iconSrc}
      alt={alt}
      fill
      draggable={false}
      sizes="200px"
      className="select-none object-cover"
    />
  );
});

// All hover visual state — explode (bigger gaps), pop-out, and dim/brighten — is
// driven by CSS classes (`hovering` on the solid; `is-focused`/`is-pressed` on
// the face) that Dodecahedron.tsx toggles imperatively, and by the `--face-z`
// custom property. So hovering NEVER re-renders these 12 faces; every prop here
// is stable for the life of the widget.
export const DodecahedronFace = memo(function DodecahedronFace({
  game,
  iconSrc,
  transform,
  sizePx,
  innerRef,
  onEnter,
  onClickFace,
}: {
  game: Game;
  iconSrc: string;
  transform: string;
  sizePx: number;
  innerRef?: React.Ref<HTMLDivElement>;
  onEnter: () => void;
  onClickFace: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      ref={innerRef}
      data-face
      className="dodeca-face absolute left-1/2 top-1/2"
      style={{
        width: sizePx,
        height: sizePx,
        marginLeft: -sizePx / 2,
        marginTop: -sizePx / 2,
        // matrix3d orients the face; translateZ(var(--face-z)) pops/explodes it
        // outward along its normal, animated purely via CSS class changes.
        transform: `${transform} translateZ(var(--face-z, 0px))`,
      }}
    >
      <a
        href={`#game-${game.id}`}
        aria-label={`Jump to ${game.name}`}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onPointerEnter={onEnter}
        onClick={onClickFace}
        className="dodeca-face-a absolute inset-0 block select-none bg-bg-elev/60"
        style={{ clipPath: PENTAGON_CLIP }}
      >
        {/* Icon fills the whole face and is cropped to the pentagon by clipPath. */}
        <FaceIcon iconSrc={iconSrc} alt={game.name} />
      </a>
      {/* Neon pentagon edge over the icon (not clipped, so the full stroke
          shows). Two stacked strokes fake a glow without CSS filters. */}
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
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <polygon
          points={PENTAGON_POINTS}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
