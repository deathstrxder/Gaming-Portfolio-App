import {
  type Vec3,
  type Quat,
  vSub,
  vScale,
  vDot,
  vCross,
  vLen,
  vNorm,
  qMul,
  qRotateVec,
  qShortestArc,
} from "@/lib/quat";
import { GAMES, type Game } from "@/lib/games";

const PHI = (1 + Math.sqrt(5)) / 2;

// The 12 face normals of a regular dodecahedron point along cyclic permutations
// of (phi, ±1, 0), matching the vertex set below (which includes the cube
// vertices (±1, ±1, ±1)). These are the true face normals: for each, exactly
// five of the 20 vertices are coplanar in the plane perpendicular to it.
const RAW_NORMALS: Vec3[] = [
  [PHI, 1, 0],
  [PHI, -1, 0],
  [-PHI, 1, 0],
  [-PHI, -1, 0],
  [0, PHI, 1],
  [0, PHI, -1],
  [0, -PHI, 1],
  [0, -PHI, -1],
  [1, 0, PHI],
  [-1, 0, PHI],
  [1, 0, -PHI],
  [-1, 0, -PHI],
];
export const FACE_NORMALS: Vec3[] = RAW_NORMALS.map(vNorm);

// The 20 dodecahedron vertices (normalized). Used to orient each pentagon so the
// faces tile, and to verify tiling in tests.
const RAW_VERTICES: Vec3[] = [
  [1, 1, 1],
  [1, 1, -1],
  [1, -1, 1],
  [1, -1, -1],
  [-1, 1, 1],
  [-1, 1, -1],
  [-1, -1, 1],
  [-1, -1, -1],
  [0, 1 / PHI, PHI],
  [0, 1 / PHI, -PHI],
  [0, -1 / PHI, PHI],
  [0, -1 / PHI, -PHI],
  [1 / PHI, PHI, 0],
  [1 / PHI, -PHI, 0],
  [-1 / PHI, PHI, 0],
  [-1 / PHI, -PHI, 0],
  [PHI, 0, 1 / PHI],
  [PHI, 0, -1 / PHI],
  [-PHI, 0, 1 / PHI],
  [-PHI, 0, -1 / PHI],
];
const VERTICES: Vec3[] = RAW_VERTICES.map(vNorm);

/** The five vertices of a face: the five dodecahedron vertices nearest its plane. */
export function faceVertices(index: number): Vec3[] {
  const n = FACE_NORMALS[index];
  return [...VERTICES].sort((a, b) => vDot(b, n) - vDot(a, n)).slice(0, 5);
}

/** In-plane unit axis from a face's center toward its first vertex. */
function faceTangent(index: number): Vec3 {
  const n = FACE_NORMALS[index];
  const v0 = faceVertices(index)[0];
  return vNorm(vSub(v0, vScale(n, vDot(v0, n))));
}

// Adjacent dodecahedron faces have normals meeting at arccos(1/sqrt5) ~ 63.435deg.
const ADJ_COS = 1 / Math.sqrt(5);

export function areAdjacent(i: number, j: number): boolean {
  if (i === j) return false;
  return Math.abs(vDot(FACE_NORMALS[i], FACE_NORMALS[j]) - ADJ_COS) < 1e-6;
}

export function antipodeOf(index: number): number {
  const n = FACE_NORMALS[index];
  return FACE_NORMALS.findIndex((m) => vDot(m, n) < -1 + 1e-6);
}

// Normalized (circumradius = 1) inradius and pentagon circumradius, so a chosen
// pixel size for the pentagon fixes the inradius that makes faces meet.
const INRADIUS_UNIT = vDot(faceVertices(0)[0], FACE_NORMALS[0]);
const FACE_CIRCUMRADIUS_UNIT = vLen(
  vSub(faceVertices(0)[0], vScale(FACE_NORMALS[0], INRADIUS_UNIT)),
);

/** Square box side (px) for a face whose pentagon circumradius is `faceRadiusPx`. */
export function faceBoxPx(faceRadiusPx: number): number {
  return 2 * faceRadiusPx;
}

/** Twelve CSS `matrix3d(...)` transforms placing each face on the solid. */
export function faceTransforms(faceRadiusPx: number, explode = 1): string[] {
  // `explode` > 1 pushes each face outward along its normal, opening gaps
  // between the faces so the interior is partially visible at all times.
  const inradiusPx =
    (faceRadiusPx * INRADIUS_UNIT * explode) / FACE_CIRCUMRADIUS_UNIT;
  return FACE_NORMALS.map((z, i) => {
    // Point the pentagon "up" in the face's local frame: the tangent (direction
    // to the first vertex) maps to local up (-Y), so an upright, object-cover
    // icon is left/right symmetric within the vertex-up pentagon. Still tiles —
    // the vertex lands on the same real dodecahedron vertex.
    const tangent = faceTangent(i);
    const y = vScale(tangent, -1); // local +Y (down) -> -tangent; local up -> tangent
    const x = vCross(y, z); // right-handed basis (x × y = z); front faces outward (+z)
    const t = vScale(z, inradiusPx);
    const m = [
      x[0], x[1], x[2], 0,
      y[0], y[1], y[2], 0,
      z[0], z[1], z[2], 0,
      t[0], t[1], t[2], 1,
    ];
    return `matrix3d(${m.map((v) => +v.toFixed(6)).join(",")})`;
  });
}

/** Container orientation that turns face `index` to face the viewer (+Z). */
export function orientationBringingFaceToFront(index: number): Quat {
  return qShortestArc(FACE_NORMALS[index], [0, 0, 1]);
}

/**
 * Orientation that turns face `index` to face the viewer AND stands its icon
 * upright — the icon's local "up" (the face tangent) is aligned with screen up.
 */
export function orientationUprightFacingViewer(index: number): Quat {
  const q1 = qShortestArc(FACE_NORMALS[index], [0, 0, 1]);
  const upScreen = qRotateVec(q1, faceTangent(index));
  const q2 = qShortestArc(upScreen, [0, -1, 0]); // screen up is -Y
  return qMul(q2, q1);
}

export type FaceAssignment = { faceIndex: number; game: Game; iconSrc: string };

// The five games that own two faces (primary + alt), each on an antipodal pair.
const TWO_ICON_GAME_IDS = [
  "clash-of-clans",
  "clash-royale",
  "brawl-stars",
  "minecraft",
  "fortnite",
] as const;

function antipodalPairs(): [number, number][] {
  const pairs: [number, number][] = [];
  const used = new Set<number>();
  for (let i = 0; i < 12; i++) {
    if (used.has(i)) continue;
    const j = antipodeOf(i);
    used.add(i);
    used.add(j);
    pairs.push([i, j]);
  }
  return pairs; // 6 pairs
}

/**
 * Assign the 12 icons to the 12 faces. Each repeated game's two icons go on an
 * antipodal (opposite, never adjacent) pair; the last pair holds the two
 * single-icon games (League of Legends and Valorant).
 */
export function buildFaceAssignments(): FaceAssignment[] {
  const pairs = antipodalPairs();
  const out: FaceAssignment[] = [];

  TWO_ICON_GAME_IDS.forEach((id, k) => {
    const game = GAMES[id];
    const [a, b] = pairs[k];
    if (!game.iconAlt) throw new Error(`Missing iconAlt for ${id}`);
    out.push({ faceIndex: a, game, iconSrc: game.icon });
    out.push({ faceIndex: b, game, iconSrc: game.iconAlt });
  });

  const [lolFace, valFace] = pairs[5];
  out.push({
    faceIndex: lolFace,
    game: GAMES["league-of-legends"],
    iconSrc: GAMES["league-of-legends"].icon,
  });
  out.push({ faceIndex: valFace, game: GAMES.valorant, iconSrc: GAMES.valorant.icon });

  return out.sort((a, b) => a.faceIndex - b.faceIndex);
}
