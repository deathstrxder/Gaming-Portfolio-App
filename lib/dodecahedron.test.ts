import { describe, it, expect } from "vitest";

import { vDot, vLen, vSub, type Vec3 } from "@/lib/quat";
import { qRotateVec } from "@/lib/quat";
import {
  FACE_NORMALS,
  faceVertices,
  areAdjacent,
  antipodeOf,
  faceTransforms,
  orientationBringingFaceToFront,
  buildFaceAssignments,
} from "@/lib/dodecahedron";

const sharedVertexCount = (a: Vec3[], b: Vec3[]) => {
  let n = 0;
  for (const va of a) for (const vb of b) if (vLen(vSub(va, vb)) < 1e-6) n++;
  return n;
};

describe("dodecahedron geometry", () => {
  it("has 12 unit-length face normals", () => {
    expect(FACE_NORMALS).toHaveLength(12);
    for (const n of FACE_NORMALS) expect(Math.abs(vLen(n) - 1)).toBeLessThan(1e-9);
  });

  it("gives every face exactly five adjacent faces", () => {
    for (let i = 0; i < 12; i++) {
      const adj = [...Array(12).keys()].filter((j) => areAdjacent(i, j));
      expect(adj).toHaveLength(5);
    }
  });

  it("pairs every face with a unique antipode", () => {
    for (let i = 0; i < 12; i++) {
      const a = antipodeOf(i);
      expect(a).not.toBe(i);
      expect(antipodeOf(a)).toBe(i);
      expect(vDot(FACE_NORMALS[i], FACE_NORMALS[a])).toBeLessThan(-0.999);
    }
  });

  it("tiles: adjacent faces share exactly one edge (two vertices)", () => {
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        if (areAdjacent(i, j)) {
          expect(sharedVertexCount(faceVertices(i), faceVertices(j))).toBe(2);
        }
      }
    }
  });

  it("produces twelve matrix3d transforms", () => {
    const t = faceTransforms(66);
    expect(t).toHaveLength(12);
    for (const s of t) expect(s.startsWith("matrix3d(")).toBe(true);
  });

  it("orients a chosen face normal toward the viewer (+Z)", () => {
    for (let i = 0; i < 12; i++) {
      const front = qRotateVec(orientationBringingFaceToFront(i), FACE_NORMALS[i]);
      expect(front[2]).toBeGreaterThan(0.999);
    }
  });

  it("assigns 12 faces with repeated games on opposite (non-adjacent) faces", () => {
    const faces = buildFaceAssignments();
    expect(faces).toHaveLength(12);
    expect(new Set(faces.map((f) => f.faceIndex)).size).toBe(12);

    // no two ADJACENT faces show the same game
    for (const a of faces) {
      for (const b of faces) {
        if (a.faceIndex !== b.faceIndex && areAdjacent(a.faceIndex, b.faceIndex)) {
          expect(a.game.id).not.toBe(b.game.id);
        }
      }
    }

    // each repeated game occupies an antipodal pair
    const byGame = new Map<string, number[]>();
    for (const f of faces) {
      byGame.set(f.game.id, [...(byGame.get(f.game.id) ?? []), f.faceIndex]);
    }
    for (const [, idxs] of byGame) {
      if (idxs.length === 2) expect(antipodeOf(idxs[0])).toBe(idxs[1]);
    }
  });
});
