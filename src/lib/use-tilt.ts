// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useCallback, useEffect, useRef } from "react";

// Pointer-tracked 3D tilt for cards and panels: the surface leans toward the cursor like a plate
// under glass — the museum's exhibits responding to inspection. Fully directional (the lean follows
// the pointer around all 360° of the surface) and buttery: a rAF loop lerps the current lean toward
// the pointer every frame, so the follow is continuous rather than stepping through a CSS
// transition. While engaged, the element's `transition` is overridden to cover only NON-transform
// properties (hover border/shadow/color fades keep working); on leave the lean eases back to rest
// and every inline override is removed, handing the element back to its classes untouched.
//
// The inline transform overrides a card's Tailwind hover translate, so callers pass `lift` to fold
// the same hover rise into the tilt. No-ops on coarse pointers (touch) and prefers-reduced-motion.
const FOLLOW = 0.16;   // lerp factor per frame toward the pointer — the "weight" of the surface
const RETURN = 0.10;   // slower settle back to rest on leave
const NON_TRANSFORM_TRANSITIONS =
  "border-color 300ms ease, box-shadow 300ms ease, background-color 300ms ease, color 300ms ease, opacity 300ms ease";

export function useTilt<T extends HTMLElement = HTMLElement>({ max = 5, lift = 0 }: { max?: number; lift?: number } = {}) {
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((el: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let engaged = false;        // pointer over the element (target follows it)
    let rx = 0, ry = 0, lf = 0; // current lean (deg, deg, px lift)
    let tx = 0, ty = 0;         // target lean

    const loop = () => {
      const k = engaged ? FOLLOW : RETURN;
      rx += (tx - rx) * k;
      ry += (ty - ry) * k;
      lf += ((engaged ? lift : 0) - lf) * k;
      const done = !engaged && Math.abs(rx) < 0.02 && Math.abs(ry) < 0.02 && Math.abs(lf) < 0.05;
      if (done) {
        raf = 0;
        el.style.transform = "";   // back to the classes' own hover behavior
        el.style.transition = "";
        el.style.willChange = "";
        return;
      }
      el.style.transform =
        `perspective(900px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)` +
        (lf > 0.01 ? ` translateY(${(-lf).toFixed(2)}px)` : "");
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      engaged = true;
      tx = -((((e.clientY - r.top) / r.height) * 2 - 1) * max);
      ty = (((e.clientX - r.left) / r.width) * 2 - 1) * max;
      // transform is rAF-driven — keep CSS transitions off it, but leave the hover fades alive
      el.style.transition = NON_TRANSFORM_TRANSITIONS;
      el.style.willChange = "transform";
      start();
    };
    const onLeave = () => { engaged = false; tx = 0; ty = 0; start(); };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    cleanupRef.current = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = "";
      el.style.transition = "";
      el.style.willChange = "";
    };
  }, [max, lift]);

  useEffect(() => () => cleanupRef.current?.(), []);
  return ref;
}
