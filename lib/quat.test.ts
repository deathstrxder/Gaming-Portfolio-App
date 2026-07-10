import { describe, it, expect } from "vitest";

import {
  type Vec3,
  type Quat,
  qIdentity,
  qMul,
  qFromAxisAngle,
  qRotateVec,
  qShortestArc,
  qSlerp,
  qToMatrix3d,
} from "@/lib/quat";

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const vClose = (a: Vec3, b: Vec3, eps = 1e-6) =>
  close(a[0], b[0], eps) && close(a[1], b[1], eps) && close(a[2], b[2], eps);

describe("quat", () => {
  it("multiplies by identity as a no-op", () => {
    const q = qFromAxisAngle([0, 1, 0], 0.7);
    expect(qMul(q, qIdentity)).toEqual(q);
  });

  it("rotates a vector 90deg about +Z", () => {
    const q = qFromAxisAngle([0, 0, 1], Math.PI / 2);
    expect(vClose(qRotateVec(q, [1, 0, 0]), [0, 1, 0])).toBe(true);
  });

  it("shortest-arc maps one direction onto another", () => {
    const q = qShortestArc([0, 0, 1], [1, 0, 0]);
    expect(vClose(qRotateVec(q, [0, 0, 1]), [1, 0, 0])).toBe(true);
  });

  it("shortest-arc handles antiparallel directions", () => {
    const q = qShortestArc([0, 0, 1], [0, 0, -1]);
    expect(vClose(qRotateVec(q, [0, 0, 1]), [0, 0, -1])).toBe(true);
  });

  it("slerp returns the endpoints at t=0 and t=1", () => {
    const a = qFromAxisAngle([0, 1, 0], 0.2);
    const b = qFromAxisAngle([0, 1, 0], 1.3);
    expect(
      vClose(qSlerp(a, b, 0).slice(0, 3) as unknown as Vec3, a.slice(0, 3) as unknown as Vec3),
    ).toBe(true);
    expect(
      vClose(qSlerp(a, b, 1).slice(0, 3) as unknown as Vec3, b.slice(0, 3) as unknown as Vec3),
    ).toBe(true);
  });

  it("emits the identity matrix3d for the identity quaternion", () => {
    expect(qToMatrix3d(qIdentity)).toBe(
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
    );
  });

  it("slerp handles a negative dot product (double-cover) and stays unit-length", () => {
    const a = qFromAxisAngle([0, 1, 0], 0.2);
    const negB: Quat = [-a[0], -a[1], -a[2], -a[3]]; // same rotation as a, opposite sign -> dot < 0
    const m = qSlerp(a, negB, 0.5);
    // -a is the SAME rotation as a, so interpolating between them stays at that rotation
    expect(vClose(qRotateVec(m, [1, 0, 0]), qRotateVec(a, [1, 0, 0]))).toBe(true);
    expect(close(Math.hypot(m[0], m[1], m[2], m[3]), 1)).toBe(true);
  });
});
