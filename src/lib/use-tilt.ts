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
const GLINT_A = 0.13;  // peak glint alpha — the soft light catching the display-case glass
const NON_TRANSFORM_TRANSITIONS =
  "border-color 300ms ease, box-shadow 300ms ease, background-color 300ms ease, color 300ms ease, opacity 300ms ease";

interface Entry {
  el: HTMLElement;
  max: number;
  lift: number;
  rx: number; ry: number; lf: number; // current lean (deg, deg, px)
  styled: boolean;                    // inline overrides currently applied
  glintEl: HTMLDivElement | null;     // the sliding specular sheen (null = disabled)
}

// The glint: a soft warm-white radial highlight that slides across the surface with the pointer —
// light catching the glass of a display case. Lives in a pointer-transparent overlay child; its
// position/strength are CSS vars the manager writes each frame. Warm-white matches the water sim's
// own highlight colour, so every glint on the page is the same light.
function makeGlint(el: HTMLElement): HTMLDivElement {
  const g = document.createElement("div");
  g.setAttribute("aria-hidden", "true");
  g.style.cssText =
    "position:absolute;inset:0;pointer-events:none;z-index:30;" +
    `border-radius:${getComputedStyle(el).borderRadius};` +
    "background:radial-gradient(260px circle at var(--gx,50%) var(--gy,50%)," +
    "rgba(255,252,245,var(--ga,0)),transparent 65%);";
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.appendChild(g);
  return g;
}

const entries = new Set<Entry>();
let px = 0, py = 0;
let pointerKnown = false;
let raf = 0;
let listening = false;

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

function settle(e: Entry) {
  e.rx = 0; e.ry = 0; e.lf = 0;
  if (e.styled) {
    e.el.style.transform = "";
    e.el.style.transition = "";
    e.el.style.willChange = "";
    e.glintEl?.style.setProperty("--ga", "0");
    e.styled = false;
  }
}

function tick() {
  raf = 0;
  let busy = false;
  const vw = window.innerWidth, vh = window.innerHeight;
  for (const e of entries) {
    let tx = 0, ty = 0, tl = 0, gf = 0, gx = 50, gy = 50;
    if (pointerKnown && !document.hidden) {
      const r = e.el.getBoundingClientRect();
      // skip empty (display:none) and fully offscreen elements — their targets stay 0
      if (r.width > 0 && r.height > 0 && r.bottom > -RANGE && r.top < vh + RANGE && r.right > -RANGE && r.left < vw + RANGE) {
        const hw = r.width / 2, hh = r.height / 2;
        const dx = px - (r.left + hw), dy = py - (r.top + hh);
        const dOut = Math.hypot(Math.max(0, Math.abs(dx) - hw), Math.max(0, Math.abs(dy) - hh));
        if (dOut < RANGE) {
          const f = smooth(1 - dOut / RANGE); // 1 over the element → 0 at range's edge
          tx = -clamp1(dy / hh) * e.max * f;
          ty = clamp1(dx / hw) * e.max * f;
          tl = e.lift * f;
          gf = f;
          // glint rides the pointer across the surface (clamped just past the edges)
          gx = Math.max(-15, Math.min(115, ((px - r.left) / r.width) * 100));
          gy = Math.max(-15, Math.min(115, ((py - r.top) / r.height) * 100));
        }
      }
    }
    e.rx += (tx - e.rx) * FOLLOW;
    e.ry += (ty - e.ry) * FOLLOW;
    e.lf += (tl - e.lf) * FOLLOW;
    const atRest = tx === 0 && ty === 0 && Math.abs(e.rx) < EPS && Math.abs(e.ry) < EPS && e.lf < EPS;
    if (atRest) {
      if (e.styled) settle(e);
      continue;
    }
    busy = true;
    if (!e.styled) {
      e.el.style.transition = NON_TRANSFORM_TRANSITIONS;
      e.el.style.willChange = "transform";
      e.styled = true;
    }
    e.el.style.transform =
      `perspective(900px) rotateX(${e.rx.toFixed(3)}deg) rotateY(${e.ry.toFixed(3)}deg)` +
      (e.lf > 0.01 ? ` translateY(${(-e.lf).toFixed(2)}px)` : "");
    if (e.glintEl) {
      e.glintEl.style.setProperty("--gx", `${gx.toFixed(1)}%`);
      e.glintEl.style.setProperty("--gy", `${gy.toFixed(1)}%`);
      e.glintEl.style.setProperty("--ga", (GLINT_A * gf).toFixed(3));
    }
  }
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
  window.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; pointerKnown = true; start(); }, { passive: true });
  // pointer left the window / tab hidden → everything eases home, then the loop stops itself
  document.documentElement.addEventListener("pointerleave", () => { pointerKnown = false; start(); });
  window.addEventListener("blur", () => { pointerKnown = false; start(); });
  document.addEventListener("visibilitychange", start);
}

export function useTilt<T extends HTMLElement = HTMLElement>({ max = 5, lift = 0, glint = true }: { max?: number; lift?: number; glint?: boolean } = {}) {
  const entryRef = useRef<Entry | null>(null);

  const remove = () => {
    if (!entryRef.current) return;
    settle(entryRef.current);
    entryRef.current.glintEl?.remove();
    entries.delete(entryRef.current);
    entryRef.current = null;
  };

  const ref = useCallback((el: T | null) => {
    remove();
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ensureListeners();
    entryRef.current = { el, max, lift, rx: 0, ry: 0, lf: 0, styled: false, glintEl: glint ? makeGlint(el) : null };
    entries.add(entryRef.current);
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max, lift, glint]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => remove(), []);
  return ref;
}
