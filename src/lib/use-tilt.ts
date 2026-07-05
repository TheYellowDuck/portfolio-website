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
//
// TOUCH devices have no pointer to be near — there the GYRO drives it instead: every visible
// registered surface leans with the device (same max, same depth layers), relative to a slowly
// re-centering baseline so any resting hand position is neutral and CHANGES drive the lean.
// Android attaches directly; iOS needs DeviceOrientationEvent.requestPermission(), which Apple
// only allows inside a user gesture — so it arms on the first tap (once, silent if denied).
// Reduced-motion skips everything on both input modes.
const RANGE = 220;     // px past the element's edge where its influence fades to zero
const FOLLOW = 0.14;   // per-frame lerp toward the target lean — the "weight" of the surface
const EPS = 0.02;      // settle threshold (deg / px)
const GYRO_RANGE = 12; // degrees of device lean that map to a surface's full max (lower = stronger)
const GYRO_DEAD = 0.4;  // deg — sensor noise deadband (keeps the loop asleep in a still hand)
const GYRO_RECENTER = 0.008; // per-event baseline drift toward the current posture (~2s settle)
const NON_TRANSFORM_TRANSITIONS =
  "border-color 300ms ease, box-shadow 300ms ease, background-color 300ms ease, color 300ms ease, opacity 300ms ease";

interface Entry {
  el: HTMLElement;
  max: number;
  lift: number;
  rx: number; ry: number; lf: number; // current lean (deg, deg, px)
  fl: number;                         // current influence 0..1 (drives the depth layers)
  styled: boolean;                    // inline overrides currently applied
  depth: { el: HTMLElement; d: number }[] | null; // [data-depth] descendants, captured on engage
  chain: HTMLElement[] | null;        // intermediate ancestors given preserve-3d for nested depth
}

const entries = new Set<Entry>();
let px = 0, py = 0;
let pointerKnown = false;
let raf = 0;
let listening = false;
let frameNo = 0;
let coldTicks = 0; // consecutive full passes that found nothing stirred and nothing in range
let coarseMode = false;      // touch device → gyro drives the lean instead of pointer proximity
let gyroAttached = false;
let gnx = 0, gny = 0;        // normalized device lean, -1..1 (x: left/right, y: front/back)
let gBaseBeta: number | null = null;
let gBaseGamma: number | null = null;
let lastGyroT = -1e9;

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
    if (e.chain) for (const p of e.chain) p.style.transformStyle = "";
    e.depth = null;
    e.chain = null;
    e.styled = false;
  }
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  if (gBaseBeta === null || gBaseGamma === null) { gBaseBeta = e.beta; gBaseGamma = e.gamma; return; }
  // deltas from the baseline, then slowly re-center it — sustained new posture becomes neutral
  let db = e.beta - gBaseBeta;
  let dg = e.gamma - gBaseGamma;
  gBaseBeta += (e.beta - gBaseBeta) * GYRO_RECENTER;
  gBaseGamma += (e.gamma - gBaseGamma) * GYRO_RECENTER;
  // fold in screen rotation so landscape tips the same visual axes
  const angle = (screen.orientation?.angle ?? 0) as number;
  let dx = dg, dy = db;
  if (angle === 90) { dx = db; dy = -dg; }
  else if (angle === 270 || angle === -90) { dx = -db; dy = dg; }
  else if (angle === 180) { dx = -dg; dy = -db; }
  if (Math.abs(dx) < GYRO_DEAD && Math.abs(dy) < GYRO_DEAD && gnx === 0 && gny === 0) return;
  gnx = clamp1(dx / GYRO_RANGE);
  gny = clamp1(dy / GYRO_RANGE);
  lastGyroT = performance.now();
  start();
}

function attachGyro() {
  if (gyroAttached) return;
  gyroAttached = true;
  window.addEventListener("deviceorientation", onOrientation, { passive: true } as AddEventListenerOptions);
}

function tick() {
  raf = 0;
  // Idle throttle: with the pointer parked far from every surface there's nothing to animate, but
  // we can't stop outright — the archive rail can still slide a card under the stationary pointer.
  // So after ~0.5s of nothing stirred, poll at 1/8 rate (a card entering range is picked up within
  // ~130ms — imperceptible, since its influence ramps from zero anyway) instead of burning 60fps.
  frameNo++;
  if (coldTicks > 30 && frameNo % 8 !== 0) {
    if ((pointerKnown || coarseMode) && !document.hidden && entries.size > 0) raf = requestAnimationFrame(tick);
    return;
  }
  let busy = false;
  let inRange = false;
  const vw = window.innerWidth, vh = window.innerHeight;
  for (const e of entries) {
    let tx = 0, ty = 0, tl = 0, tf = 0;
    if (coarseMode && !document.hidden) {
      // gyro: every VISIBLE surface leans with the device (no lift — there's no hover to echo)
      if (gnx !== 0 || gny !== 0) {
        const r = e.el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) {
          inRange = true;
          tx = gny * e.max;   // tilt up -> lean down
          ty = -gnx * e.max;  // tilt right -> lean left
          tf = Math.min(1, Math.hypot(gnx, gny));
        }
      }
    } else if (pointerKnown && !document.hidden) {
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
    // converged at a NON-zero lean (gyro holding steady): keep the transform, stop polling —
    // the next deviceorientation event restarts the loop.
    const converged =
      Math.abs(tx - e.rx) < EPS && Math.abs(ty - e.ry) < EPS && Math.abs(tl - e.lf) < EPS && Math.abs(tf - e.fl) < EPS;
    if (!converged) busy = true;
    if (!e.styled) {
      e.el.style.transition = NON_TRANSFORM_TRANSITIONS;
      e.el.style.willChange = "transform";
      // Depth layers: descendants marked data-depth pop out on their own planes while the surface
      // leans. Nested marks work too — every intermediate ancestor gets transform-style:
      // preserve-3d (and is restored on settle), since any un-preserved ancestor would flatten the
      // plane. Captured on engage, so React re-renders between hovers never leave stale nodes.
      // Depth rides the same influence ramp (e.fl) — layers rise from flat, nothing jumps at the
      // range boundary. NOTE: an overflow:hidden ancestor still flattens (CSS grouping property,
      // beats preserve-3d) — keep clips on the media/leaf elements, not on ancestors of marks.
      e.el.style.transformStyle = "preserve-3d";
      const marks = Array.from(e.el.querySelectorAll<HTMLElement>("[data-depth]"));
      const chain = new Set<HTMLElement>();
      for (const c of marks) {
        let p = c.parentElement;
        while (p && p !== e.el) { chain.add(p); p = p.parentElement; }
      }
      for (const p of chain) p.style.transformStyle = "preserve-3d";
      e.chain = chain.size ? Array.from(chain) : null;
      e.depth = marks.map((c) => ({ el: c, d: parseFloat(c.dataset.depth || "0") || 0 }));
      e.styled = true;
    }
    e.el.style.transform =
      `perspective(700px) rotateX(${e.rx.toFixed(3)}deg) rotateY(${e.ry.toFixed(3)}deg)` +
      (e.lf > 0.01 ? ` translateY(${(-e.lf).toFixed(2)}px)` : "");
    if (e.depth) {
      for (const c of e.depth) c.el.style.transform = `translateZ(${(c.d * e.fl).toFixed(2)}px)`;
    }
  }
  coldTicks = busy || inRange ? 0 : coldTicks + 1;
  // keep polling while anything is stirred, while the pointer could stir a moving element
  // (auto-scroll), or briefly after gyro activity — stop entirely only when idle.
  if (busy || ((pointerKnown || (coarseMode && performance.now() - lastGyroT < 300)) && !document.hidden && entries.size > 0)) {
    raf = requestAnimationFrame(tick);
  }
}

function start() { if (!raf) raf = requestAnimationFrame(tick); }

function ensureListeners() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  if (coarseMode) {
    // Android and friends fire deviceorientation freely; iOS 13+ gates it behind a permission
    // call that MUST run inside a user gesture — arm it on the first tap, once, silent if denied.
    type PermissionedDOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
    const DOE = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined) as PermissionedDOE | undefined;
    if (!DOE) return;
    if (typeof DOE.requestPermission === "function") {
      // Arm on the FIRST CONTACT of any kind — touchstart covers the touch that begins a scroll,
      // not just taps. If a particular event doesn't carry user-activation (the call rejects
      // without showing a prompt), keep listening and try again on the next contact; once the
      // prompt has actually been ANSWERED (granted or denied resolves), stop for good.
      const GESTURES = ["touchstart", "touchend", "click"] as const;
      const arm = () => {
        DOE.requestPermission!()
          .then((res) => {
            for (const t of GESTURES) window.removeEventListener(t, arm, true);
            if (res === "granted") attachGyro();
          })
          .catch(() => { /* no gesture context / dismissed — stay armed for the next contact */ });
      };
      for (const t of GESTURES) window.addEventListener(t, arm, { capture: true, passive: true });
    } else {
      attachGyro();
    }
    document.addEventListener("visibilitychange", start);
    return; // no pointer-proximity listeners on touch
  }
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    coarseMode = !window.matchMedia("(pointer: fine)").matches;
    ensureListeners();
    entryRef.current = { el, max, lift, rx: 0, ry: 0, lf: 0, fl: 0, styled: false, depth: null, chain: null };
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
