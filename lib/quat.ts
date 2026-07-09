export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number]; // [x, y, z, w]

export function vSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
export function vScale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
export function vDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function vCross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
export function vLen(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}
export function vNorm(a: Vec3): Vec3 {
  const l = vLen(a);
  return l === 0 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
}

export const qIdentity: Quat = [0, 0, 0, 1];

export function qMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}
export function qNorm(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
export function qFromAxisAngle(axis: Vec3, angle: number): Quat {
  const n = vNorm(axis);
  const h = angle / 2;
  const s = Math.sin(h);
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(h)];
}
export function qRotateVec(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}
export function qShortestArc(from: Vec3, to: Vec3): Quat {
  const f = vNorm(from);
  const t = vNorm(to);
  const d = vDot(f, t);
  if (d >= 1 - 1e-8) return qIdentity;
  if (d <= -1 + 1e-8) {
    // antiparallel: rotate 180deg about any axis orthogonal to f
    let axis = vCross([1, 0, 0], f);
    if (vLen(axis) < 1e-6) axis = vCross([0, 1, 0], f);
    return qFromAxisAngle(axis, Math.PI);
  }
  const axis = vCross(f, t);
  const s = Math.sqrt((1 + d) * 2);
  return qNorm([axis[0] / s, axis[1] / s, axis[2] / s, s / 2]);
}
export function qSlerp(a: Quat, b: Quat, t: number): Quat {
  const [ax, ay, az, aw] = a;
  let [bx, by, bz, bw] = b;
  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cos = -cos;
  }
  if (cos > 0.9995) {
    return qNorm([
      ax + (bx - ax) * t,
      ay + (by - ay) * t,
      az + (bz - az) * t,
      aw + (bw - aw) * t,
    ]);
  }
  const theta = Math.acos(cos);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return [ax * wa + bx * wb, ay * wa + by * wb, az * wa + bz * wb, aw * wa + bw * wb];
}
export function qToMatrix3d(q: Quat, translate: Vec3 = [0, 0, 0]): string {
  const [x, y, z, w] = qNorm(q);
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  // column-major 4x4: columns = local X, Y, Z axes, then translation
  const m = [
    1 - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1 - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1 - (xx + yy), 0,
    translate[0], translate[1], translate[2], 1,
  ];
  return `matrix3d(${m.map((v) => (Object.is(v, -0) ? 0 : v)).join(",")})`;
}
