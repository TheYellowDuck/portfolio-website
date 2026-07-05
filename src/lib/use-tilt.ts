// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useCallback, useEffect, useRef } from "react";

// Proximity 3D tilt: surfaces lean toward the pointer whenever it's NEAR them — not just hovering.
// Full strength over the element, easing off with distance until RANGE px past its edge, so cards
// stir as the cursor approaches and settle as it moves away. One shared manager (a single window
// pointermove + one rAF loop) re-reads each registered element's rect every frame, which is what
// makes MOVING surfaces react too: the archive rail auto-scrolling a card under a stationary
// pointer tilts it exactly as if the pointer had swept across.
//
// While a surface is stirred, its `transition` is overridden to cover only NON-transform properties
// (hover border/shadow/color fades keep working; the transform itself is rAF-lerped — buttery, all
// directions). Once settled, every inline override is removed and the classes take back over.
// `lift` folds a card's Tailwind hover rise into the tilt transform (which overrides the class).
// Registration no-ops on coarse pointers (touch) and under prefers-reduced-motion.
const RANGE = 220;     // px past the element's edge where its influence fades to zero
const FOLLOW = 0.14;   // per-frame lerp toward the target lean — the "weight" of the surface
const EPS = 0.02;      // settle threshold (deg / px)
const NON_TRANSFORM_TRANSITIONS =
  "border-color 300ms ease, box-shadow 300ms ease, background-color 300ms ease, color 300ms ease, opacity 300ms ease";

interface Entry {
  el: HTMLElement;
  max: number;
  lift: number;
  rx: number; ry: number; lf: number; // current lean (deg, deg, px)
  fl: number;                         // current influence 0..1 (drives the depth layers)
  styled: boolean;                    // inline overrides currently applied
  depth: { el: HTMLElement; d: number }[] | null; // [data-depth] children, captured on engage
}

const entries = new Set<Entry>();
let px = 0, py = 0;
let pointerKnown = false;
let raf = 0;
let listening = false;
let frameNo = 0;
let coldTicks = 0; // consecutive full passes that found nothing stirred and nothing in range

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

function settle(e: Entry) {
  e.rx = 0; e.ry = 0; e.lf = 0; e.fl = 0;
  if (e.styled) {
    e.el.style.transform = "";
    e.el.style.transition = "";
    e.el.style.willChange = "";
    e.el.style.transformStyle = "";
    if (e.depth) for (const c of e.depth) c.el.style.transform = "";
    e.depth = null;
    e.styled = false;
  }
}

function tick() {
  raf = 0;
  // Idle throttle: with the pointer parked far from every surface there's nothing to animate, but
  // we can't stop outright — the archive rail can still slide a card under the stationary pointer.
  // So after ~0.5s of nothing stirred, poll at 1/8 rate (a card entering range is picked up within
  // ~130ms — imperceptible, since its influence ramps from zero anyway) instead of burning 60fps.
  frameNo++;
  if (coldTicks > 30 && frameNo % 8 !== 0) {
    if (pointerKnown && !document.hidden && entries.size > 0) raf = requestAnimationFrame(tick);
    return;
  }
  let busy = false;
  let inRange = false;
  const vw = window.innerWidth, vh = window.innerHeight;
  for (const e of entries) {
    let tx = 0, ty = 0, tl = 0, tf = 0;
    if (pointerKnown && !document.hidden) {
      const r = e.el.getBoundingClientRect();
      // skip empty (display:none) and fully offscreen elements — their targets stay 0
      if (r.width > 0 && r.height > 0 && r.bottom > -RANGE && r.top < vh + RANGE && r.right > -RANGE && r.left < vw + RANGE) {
        const hw = r.width / 2, hh = r.height / 2;
        const dx = px - (r.left + hw), dy = py - (r.top + hh);
        const dOut = Math.hypot(Math.max(0, Math.abs(dx) - hw), Math.max(0, Math.abs(dy) - hh));
        if (dOut < RANGE) {
          inRange = true;
          const f = smooth(1 - dOut / RANGE); // 1 over the element → 0 at range's edge
          tx = -clamp1(dy / hh) * e.max * f;
          ty = clamp1(dx / hw) * e.max * f;
          tl = e.lift * f;
          tf = f;
        }
      }
    }
    e.rx += (tx - e.rx) * FOLLOW;
    e.ry += (ty - e.ry) * FOLLOW;
    e.lf += (tl - e.lf) * FOLLOW;
    e.fl += (tf - e.fl) * FOLLOW;
    const atRest = tx === 0 && ty === 0 && Math.abs(e.rx) < EPS && Math.abs(e.ry) < EPS && e.lf < EPS && e.fl < EPS;
    if (atRest) {
      if (e.styled) settle(e);
      continue;
    }
    busy = true;
    if (!e.styled) {
      e.el.style.transition = NON_TRANSFORM_TRANSITIONS;
      e.el.style.willChange = "transform";
      // Depth layers: direct children marked data-depth pop out on their own planes while the
      // surface leans (preserve-3d keeps their translateZ in the card's 3D context). Captured on
      // engage, so React re-renders between hovers never leave stale nodes. Their depth rides the
      // same influence ramp (e.fl) — layers rise from flat, nothing jumps at the range boundary.
      // NOTE: children of overflow:hidden surfaces flatten (CSS grouping property) — those
      // surfaces simply don't mark depth children.
      e.el.style.transformStyle = "preserve-3d";
      e.depth = Array.from(e.el.querySelectorAll<HTMLElement>(":scope > [data-depth]"))
        .map((c) => ({ el: c, d: parseFloat(c.dataset.depth || "0") || 0 }));
      e.styled = true;
    }
    e.el.style.transform =
      `perspective(900px) rotateX(${e.rx.toFixed(3)}deg) rotateY(${e.ry.toFixed(3)}deg)` +
      (e.lf > 0.01 ? ` translateY(${(-e.lf).toFixed(2)}px)` : "");
    if (e.depth) {
      for (const c of e.depth) c.el.style.transform = `translateZ(${(c.d * e.fl).toFixed(2)}px)`;
    }
  }
  coldTicks = busy || inRange ? 0 : coldTicks + 1;
  // keep polling while anything is stirred, or while the pointer is on the page and could stir a
  // moving element (auto-scroll) — stop entirely only when idle with the pointer gone.
  if (busy || (pointerKnown && !document.hidden && entries.size > 0)) {
    raf = requestAnimationFrame(tick);
  }
}

function start() { if (!raf) raf = requestAnimationFrame(tick); }

function ensureListeners() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; pointerKnown = true; coldTicks = 0; start(); }, { passive: true });
  // pointer left the window / tab hidden → everything eases home, then the loop stops itself
  document.documentElement.addEventListener("pointerleave", () => { pointerKnown = false; start(); });
  window.addEventListener("blur", () => { pointerKnown = false; start(); });
  document.addEventListener("visibilitychange", start);
}

export function useTilt<T extends HTMLElement = HTMLElement>({ max = 5, lift = 0 }: { max?: number; lift?: number } = {}) {
  const entryRef = useRef<Entry | null>(null);

  const ref = useCallback((el: T | null) => {
    if (entryRef.current) {
      settle(entryRef.current);
      entries.delete(entryRef.current);
      entryRef.current = null;
    }
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ensureListeners();
    entryRef.current = { el, max, lift, rx: 0, ry: 0, lf: 0, fl: 0, styled: false, depth: null };
    entries.add(entryRef.current);
    start();
  }, [max, lift]);

  useEffect(() => () => {
    if (entryRef.current) {
      settle(entryRef.current);
      entries.delete(entryRef.current);
      entryRef.current = null;
    }
  }, []);
  return ref;
}
