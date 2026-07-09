"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import type { FaceAssignment } from "@/lib/dodecahedron";
import {
  FACE_NORMALS,
  faceTransforms,
  faceBoxPx,
  orientationBringingFaceToFront,
  orientationUprightFacingViewer,
} from "@/lib/dodecahedron";
import {
  type Quat,
  qIdentity,
  qFromAxisAngle,
  qMul,
  qRotateVec,
  qShortestArc,
  qSlerp,
  qToMatrix3d,
} from "@/lib/quat";
import { DodecahedronFace } from "@/components/site/DodecahedronFace";

const FACE_RADIUS_PX = 92.4; // pentagon circumradius (66 × 1.4)
const PERSPECTIVE_PX = 900;
const IDLE_SPEED = 0.00035; // rad/ms (~1 turn / 18s)
const ENTRANCE_SPEED = 0.004; // faster tumble while it materializes
const ENTRANCE_MS = 1100;
const IDLE_AXIS = [0.35, 1, 0.15] as const;
const FOCUS_TAU = 90; // ms; smaller = snappier settle to front
const DRAG_SENS = 0.007; // rad per px
const DRAG_THRESHOLD_PX = 6;
const EXPLODE = 1.12; // push faces out along their normals to open gaps
const POP_PX = 30; // extra outward offset for the hovered (focused) face
const FOCUS_SPIN = 0.0005; // rad/ms — spin rate while "locked on" a hovered icon
const BACK_OPACITY = 0.26; // faded interior faces seen through the gaps

type Mode = "idle" | "dragging" | "focused";

export function Dodecahedron({ faces }: { faces: FaceAssignment[] }) {
  const reduced = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const solidRef = useRef<HTMLDivElement>(null);

  const transforms = faceTransforms(FACE_RADIUS_PX, EXPLODE);
  const boxPx = faceBoxPx(FACE_RADIUS_PX);

  const [focusedFace, setFocusedFace] = useState<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [entered, setEntered] = useState(false);

  // Loop state lives in refs so the rAF loop never triggers React re-renders.
  const orientation = useRef<Quat>(qIdentity);
  const mode = useRef<Mode>("idle");
  const focusIndex = useRef<number | null>(null);
  const focusTarget = useRef<Quat>(qIdentity);
  const aligning = useRef(false);
  const faceEls = useRef<(HTMLDivElement | null)[]>([]);
  const drag = useRef({ x: 0, y: 0, vx: 0, vy: 0, moved: 0, active: false });
  const inertia = useRef<[number, number]>([0, 0]);
  const enteredAt = useRef<number | null>(null);
  const visible = useRef(true);
  const pointerOverFace = useRef(false);
  const scrollTimer = useRef<number | undefined>(undefined);

  // The 3D orientation goes on the preserve-3d solid; the entrance scale/opacity
  // go on the outer wrapper. Applying opacity (or overflow/filter/scale-less-than-
  // needed grouping) to a preserve-3d element makes the browser FLATTEN it —
  // collapsing all 12 faces into a single plane — so those must never touch it.
  function renderRotation() {
    const el = solidRef.current;
    if (el) el.style.transform = qToMatrix3d(orientation.current);
  }
  function renderEntrance(scale = 1, opacity = 1) {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = String(opacity);
  }
  // Fade faces that turn away so their icons read as faded ghosts inside the
  // shape, seen through the gaps between the exploded faces.
  function updateFaceOpacity() {
    const els = faceEls.current;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (!el) continue;
      const facing = qRotateVec(orientation.current, FACE_NORMALS[i])[2];
      const t = Math.max(0, Math.min(1, (facing + 0.35) / 0.7));
      el.style.opacity = String(BACK_OPACITY + (1 - BACK_OPACITY) * t);
    }
  }

  // Trigger entrance the first time the widget is on screen; pause loop off-screen.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visible.current = e.isIntersecting;
          if (e.isIntersecting && !entered) setEntered(true);
        }
      },
      { threshold: 0.25 },
    );
    io.observe(stage);
    return () => io.disconnect();
  }, [entered]);

  // Reduced motion: a single static, slightly tilted pose. No loop.
  useEffect(() => {
    if (!reduced) return;
    orientation.current = qMul(
      qFromAxisAngle([1, 0, 0], -0.35),
      orientationBringingFaceToFront(0),
    );
    renderRotation();
    renderEntrance(1, 1);
    updateFaceOpacity();
  }, [reduced]);

  // Hold the solid at the entrance start (small, invisible) until it scrolls
  // into view, so it never flashes full-size before animating in. Runs only on
  // the client after mount; the server/no-JS render stays full-size and visible.
  useEffect(() => {
    if (reduced || entered) return;
    renderRotation();
    renderEntrance(0.2, 0);
  }, [reduced, entered]);

  // The animation loop.
  useEffect(() => {
    if (reduced || !entered) return;
    let raf = 0;
    let prev: number | null = null;
    enteredAt.current = null;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (prev === null) prev = now;
      let dt = now - prev;
      prev = now;
      if (dt > 64) dt = 64; // clamp after a tab switch
      if (enteredAt.current === null) enteredAt.current = now;
      if (!visible.current) return;

      const since = now - enteredAt.current;

      if (mode.current === "focused" && focusIndex.current !== null) {
        const k = 1 - Math.exp(-dt / FOCUS_TAU);
        if (aligning.current) {
          // Phase 1: ease the icon upright and facing the viewer (as in the
          // source art) before any spin begins.
          orientation.current = qSlerp(orientation.current, focusTarget.current, k);
          const q = orientation.current;
          const tgt = focusTarget.current;
          const d = q[0] * tgt[0] + q[1] * tgt[1] + q[2] * tgt[2] + q[3] * tgt[3];
          if (Math.abs(d) > 0.9998) aligning.current = false;
        } else {
          // Phase 2: spin around the axis through the hovered icon into the
          // screen (world +Z), easing that face's normal to the viewer so we
          // stay "locked on" while the shape keeps spinning.
          orientation.current = qMul(
            qFromAxisAngle([0, 0, 1], FOCUS_SPIN * dt),
            orientation.current,
          );
          const nScreen = qRotateVec(
            orientation.current,
            FACE_NORMALS[focusIndex.current],
          );
          const correction = qShortestArc(nScreen, [0, 0, 1]);
          orientation.current = qMul(qSlerp(qIdentity, correction, k), orientation.current);
        }
      } else if (mode.current !== "dragging") {
        // idle tumble, faster during the entrance window
        let speed = IDLE_SPEED;
        if (since < ENTRANCE_MS) {
          const p = since / ENTRANCE_MS;
          speed = ENTRANCE_SPEED + (IDLE_SPEED - ENTRANCE_SPEED) * p;
        }
        orientation.current = qMul(qFromAxisAngle([...IDLE_AXIS], speed * dt), orientation.current);

        // decaying inertia handed off from a fling
        const [ivx, ivy] = inertia.current;
        if (Math.abs(ivx) > 1e-6 || Math.abs(ivy) > 1e-6) {
          orientation.current = qMul(
            qMul(qFromAxisAngle([0, 1, 0], ivx * dt), qFromAxisAngle([1, 0, 0], ivy * dt)),
            orientation.current,
          );
          const decay = Math.pow(0.9, dt / 16);
          inertia.current = [ivx * decay, ivy * decay];
        }
      }

      // entrance scale/opacity (skip while dragging, which only happens post-entrance)
      let scale = 1;
      let opacity = 1;
      if (since < ENTRANCE_MS) {
        const p = since / ENTRANCE_MS;
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        scale = 0.2 + 0.8 * eased;
        opacity = eased;
      }
      renderRotation();
      renderEntrance(scale, opacity);
      updateFaceOpacity();
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, entered]);

  useEffect(
    () => () => {
      if (scrollTimer.current !== undefined) window.clearTimeout(scrollTimer.current);
    },
    [],
  );

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: 0, vy: 0, moved: 0, active: true };
    inertia.current = [0, 0];
    setIsPressed(true); // pressing/holding a hovered icon pops it back in
    mode.current = "dragging";
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    drag.current.moved += Math.abs(dx) + Math.abs(dy);
    orientation.current = qMul(
      qMul(qFromAxisAngle([0, 1, 0], dx * DRAG_SENS), qFromAxisAngle([1, 0, 0], dy * DRAG_SENS)),
      orientation.current,
    );
    drag.current.vx = dx * DRAG_SENS;
    drag.current.vy = dy * DRAG_SENS;
    renderRotation();
  }

  function onPointerUp() {
    setIsPressed(false);
    if (!drag.current.active) return;
    drag.current.active = false;
    inertia.current = [drag.current.vx * 0.6, drag.current.vy * 0.6];
    mode.current = focusIndex.current != null ? "focused" : "idle";
  }

  function onFaceEnter(index: number) {
    if (drag.current.active) return;
    pointerOverFace.current = true;
    focusIndex.current = index;
    focusTarget.current = orientationUprightFacingViewer(index);
    aligning.current = true; // stand the icon upright first, then spin
    setFocusedFace(index);
    mode.current = "focused";
  }

  function onStageLeave() {
    pointerOverFace.current = false;
    if (drag.current.active) return;
    focusIndex.current = null;
    setFocusedFace(null);
    mode.current = "idle";
  }

  function onFaceClick(e: React.MouseEvent, index: number, gameId: string) {
    e.preventDefault();
    if (drag.current.moved > DRAG_THRESHOLD_PX) return; // it was a drag
    focusIndex.current = index;
    focusTarget.current = orientationUprightFacingViewer(index);
    aligning.current = true; // stand the icon upright first, then spin
    mode.current = "focused";
    setFocusedFace(index);
    const target = document.getElementById(`game-${gameId}`);
    const go = () => {
      target?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `#game-${gameId}`);
      // Touch/keyboard activation has no lingering hover to hold the face, so
      // resume the idle tumble once the scroll starts. A mouse still hovering
      // keeps pointerOverFace true and the face stays locked until it leaves.
      if (!pointerOverFace.current) {
        focusIndex.current = null;
        mode.current = "idle";
        setFocusedFace(null);
      }
    };
    if (reduced) go();
    else scrollTimer.current = window.setTimeout(go, 420);
  }

  return (
    <div
      ref={wrapperRef}
      className="mx-auto"
      style={{ width: "100%", maxWidth: 420, willChange: "transform, opacity" }}
    >
      <div
        ref={stageRef}
        className="grid touch-none select-none place-items-center"
        style={{ width: "100%", aspectRatio: "1 / 1", perspective: PERSPECTIVE_PX }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onStageLeave}
      >
        <div
          ref={solidRef}
          className="relative"
          style={{
            width: boxPx,
            height: boxPx,
            transformStyle: "preserve-3d",
            willChange: "transform",
          }}
        >
          {faces.map((f) => (
            <DodecahedronFace
              key={f.faceIndex}
              innerRef={(el) => {
                faceEls.current[f.faceIndex] = el;
              }}
              game={f.game}
              iconSrc={f.iconSrc}
              transform={transforms[f.faceIndex]}
              sizePx={boxPx}
              popPx={POP_PX}
              focused={focusedFace === f.faceIndex}
              pressed={isPressed && focusedFace === f.faceIndex}
              onEnter={() => onFaceEnter(f.faceIndex)}
              onClickFace={(e) => onFaceClick(e, f.faceIndex, f.game.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
