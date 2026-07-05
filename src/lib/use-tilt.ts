// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useCallback, useEffect, useRef } from "react";

// Pointer-tracked 3D tilt for cards and panels: the surface leans toward the cursor like a plate
// under glass — the museum's exhibits responding to inspection. Deliberately subtle (a few degrees)
// and cheap: no rAF loop; the element's own CSS transform transition (cards already have
// transition-all/transition-transform) eases toward each new target, which is what gives the soft
// "magnetic" follow instead of a rigid track.
//
// The inline transform overrides a card's Tailwind hover translate, so callers pass `lift` to fold
// the same hover rise into the tilt (and everything returns to the classes when the pointer leaves).
// No-ops entirely on coarse pointers (touch) and under prefers-reduced-motion.
export function useTilt<T extends HTMLElement = HTMLElement>({ max = 4, lift = 0 }: { max?: number; lift?: number } = {}) {
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((el: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;   // -1 (left edge) … 1 (right edge)
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      el.style.transform =
        `perspective(900px) rotateX(${(-ny * max).toFixed(2)}deg) rotateY(${(nx * max).toFixed(2)}deg)` +
        (lift ? ` translateY(${-lift}px)` : "");
    };
    const onLeave = () => { el.style.transform = ""; };       // hand control back to the CSS classes
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    cleanupRef.current = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = "";
    };
  }, [max, lift]);

  useEffect(() => () => cleanupRef.current?.(), []);
  return ref;
}
