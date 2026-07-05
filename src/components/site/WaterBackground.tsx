// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useRef } from "react";
import { introArmed } from "@/lib/intro-gate";

// A water surface behind the whole site. A height-field ripple simulation: a tap/click drops a
// ripple, and moving or dragging the pointer pushes a flow along its path. It's rendered as subtle
// directional light/shadow over the page background, behind ALL content (-z-10, pointer-events:none),
// so it never blocks clicks. Skipped entirely under prefers-reduced-motion, and paused while the
// pixel-art game covers the screen (body.game-active).
//
// Anchoring differs by input — see `docMode`. On a touch device the browser scrolls the page as a
// FROZEN SNAPSHOT (during a touch-scroll, `scroll` events don't fire, scrollY stops updating, rAF is
// throttled, and the compositor won't repaint a fixed layer) — so a viewport-fixed canvas freezes in
// place mid-scroll. The fix is to make the canvas part of the scrolling content: anchored to the
// DOCUMENT (absolute, full scroll height) it scrolls WITH the page as part of that snapshot, so it
// never looks frozen; it simply pauses animating during the scroll and resumes after. Desktop keeps
// the fixed viewport pane (it repaints fine during a wheel-scroll, and that's the dialed-in feel).
//
// Cheap by construction: the sim/render run on a coarse grid (one cell per CELL px), drawn into a
// tiny canvas that the browser smoothly upscales — so the ripples look soft and the per-frame work
// stays small even on phones. Tune the feel with the constants below.
const CELL = 6;            // base px per simulation cell (finer = crisper ripples)
const MAX_CELLS = 90000;  // cap total cells (coarsen on large surfaces so it stays cheap)
const DAMP = 0.965;       // wave decay per frame (closer to 1 = longer-lived ripples)
const RIPPLE_FORCE = 120;  // impulse from a tap / click
const FLOW_STEP = 4;       // gentle impulse laid densely ALONG a moving pointer's path (smooth wake)
const FLOW_MAX_STEPS = 96; // cap interpolation steps per move (avoids huge work on a big jump)
const K_LIGHT = 0.01;     // slope → highlight ramp
const K_SHADE = 0.0025;   // slope → shadow ramp (kept gentle)
const HI_A = 0.3;         // max highlight alpha (the crest glints)
const SH_A = 0.07;        // max shadow alpha (troughs) — faint, just enough for depth
const HI = [255, 252, 245] as const; // warm soft-white glint (sits in the parchment palette)
const LO = [70, 56, 36] as const; //   warm shadow — the ink colour, never cold/blue
const AMBIENT_EVERY = 95; // frames between gentle ambient ripples — keeps the surface barely alive
const AMBIENT_FORCE = 30; // gentle

export default function WaterBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    // Touch-primary devices anchor the field to the document so the canvas scrolls with the page
    // (see the file header); everything else keeps the fixed viewport pane.
    const docMode = window.matchMedia?.("(pointer: coarse)").matches ?? false;

    let cols = 0;
    let rows = 0;
    let cell = CELL; // effective px/cell (coarsened on huge surfaces, see resize)
    let fieldW = 0; // px the field spans horizontally …
    let fieldH = 0; // … and vertically (viewport height, or the whole document in docMode)
    let prev = new Float32Array(0); // height field, t-1
    let cur = new Float32Array(0); //  height field, t
    let img = ctx.createImageData(1, 1);

    // docMode height = the DOCUMENT's own height. Measure the body's box (offsetHeight): the canvas
    // is absolutely positioned (out of flow) so it can't inflate that, AND — crucially — it does NOT
    // change when the mobile URL bar shows/hides during a scroll (that only changes innerHeight). So
    // a scroll never looks like a resize, and never resets the sim.
    const measure = () => ({
      w: Math.max(1, window.innerWidth),
      h: docMode ? Math.max(window.innerHeight, document.body.offsetHeight) : Math.max(1, window.innerHeight),
    });

    const resize = () => {
      const { w, h } = measure();
      fieldW = w;
      fieldH = h;
      cell = CELL;
      while ((w / cell) * (h / cell) > MAX_CELLS) cell++; // keep total cells bounded
      cols = Math.max(4, Math.ceil(w / cell) + 1);
      rows = Math.max(4, Math.ceil(h / cell) + 1);
      canvas.width = cols; // the canvas is grid-resolution …
      canvas.height = rows;
      canvas.style.width = `${w}px`; // … and CSS-scaled up to the surface (soft upscale)
      canvas.style.height = `${h}px`;
      if (docMode) {
        // Absolute + top:0 with no positioned ancestor anchors to the document origin and scrolls
        // with the page, so it keeps painting (as part of the scroll snapshot) through a touch-scroll.
        canvas.style.position = "absolute";
        canvas.style.inset = "auto";
        canvas.style.top = "0px";
        canvas.style.left = "0px";
      }
      prev = new Float32Array(cols * rows);
      cur = new Float32Array(cols * rows);
      img = ctx.createImageData(cols, rows);
    };
    resize();

    // Re-fit ONLY on a real surface change — a width change (orientation) or a substantial document
    // height change (images/fonts/dynamic content). docMode ignores viewport-height-only jitter
    // (the mobile URL bar) and never re-fits mid-gesture, so a scroll can't wipe the water.
    let touching = false;
    let pendingFit = false;
    const maybeResize = () => {
      if (touching) { pendingFit = true; return; }
      const { w, h } = measure();
      const hChanged = docMode ? Math.abs(h - fieldH) > 64 : h !== fieldH;
      if (w !== fieldW || hChanged) resize();
    };

    // Push a disturbance into the field at surface px (px,py), with a smooth GAUSSIAN falloff over
    // radius R cells — so overlapping disturbances along a path blend into one continuous, soft wake.
    const disturb = (px: number, py: number, force: number, R: number) => {
      const x0 = Math.round(px / cell);
      const y0 = Math.round(py / cell);
      const inv = 1 / (R * R * 0.6);
      for (let dy = -R; dy <= R; dy++) {
        const y = y0 + dy;
        if (y < 1 || y >= rows - 1) continue;
        for (let dx = -R; dx <= R; dx++) {
          const x = x0 + dx;
          if (x < 1 || x >= cols - 1) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 > R * R) continue;
          prev[y * cols + x] -= force * Math.exp(-d2 * inv);
        }
      }
    };

    const paused = () => document.body.classList.contains("game-active") || document.hidden;
    let lastX = -1;
    let lastY = -1;
    // Lay disturbance CONTINUOUSLY along the path from the last point to (x,y), so a moving pointer
    // reads as one flowing wake instead of a string of separate click-ripples.
    const flow = (x: number, y: number) => {
      if (!paused() && lastX >= 0) {
        const dx = x - lastX;
        const dy = y - lastY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const steps = Math.min(Math.max(1, Math.ceil((dist / cell) * 2)), FLOW_MAX_STEPS);
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            disturb(lastX + dx * t, lastY + dy * t, FLOW_STEP, 3);
          }
        }
      }
      lastX = x;
      lastY = y;
    };
    const ripple = (x: number, y: number) => {
      if (!paused()) disturb(x, y, RIPPLE_FORCE, 2);
      lastX = x;
      lastY = y;
    };

    // Client (viewport) → field coords: in docMode the field is the whole document, so fold in scroll.
    const fx = (clientX: number) => (docMode ? clientX + window.scrollX : clientX);
    const fy = (clientY: number) => (docMode ? clientY + window.scrollY : clientY);

    // Mouse / pen → pointer events. Touch → touch events (split by type so a touch isn't counted
    // twice, since it fires both).
    const onPointerDown = (e: PointerEvent) => { if (e.pointerType !== "touch") ripple(fx(e.clientX), fy(e.clientY)); };
    const onPointerMove = (e: PointerEvent) => { if (e.pointerType !== "touch") flow(fx(e.clientX), fy(e.clientY)); };
    const onTouchStart = (e: TouchEvent) => { touching = true; const t = e.touches[0]; if (t) ripple(fx(t.clientX), fy(t.clientY)); };
    const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; if (t) flow(fx(t.clientX), fy(t.clientY)); };
    const onTouchEnd = () => { touching = false; if (pendingFit) { pendingFit = false; maybeResize(); } };

    // capture: true → the water sees the input no matter which element it starts on or whether an
    // element handles it (e.g. a card/link/scroller on mobile), since capture fires before bubbling.
    const cap = { passive: true, capture: true } as const;
    // Tab switch leaves a stale last point; drop it so the first move on return doesn't streak a
    // wake clear across the screen from where the pointer used to be.
    const onVisible = () => { lastX = -1; lastY = -1; };
    window.addEventListener("resize", maybeResize);
    window.addEventListener("pointerdown", onPointerDown, cap);
    window.addEventListener("pointermove", onPointerMove, cap);
    window.addEventListener("touchstart", onTouchStart, cap);
    window.addEventListener("touchmove", onTouchMove, cap);
    window.addEventListener("touchend", onTouchEnd, cap);
    window.addEventListener("touchcancel", onTouchEnd, cap);
    document.addEventListener("visibilitychange", onVisible);

    // docMode: the document can grow/shrink (images, fonts, dynamic content), so re-fit when it does.
    // Observe the body's own box — never the canvas — so re-fitting can't feed back into another fit.
    let ro: ResizeObserver | undefined;
    if (docMode && "ResizeObserver" in window) {
      ro = new ResizeObserver(maybeResize);
      ro.observe(document.body);
    }

    // Opening splash at the current viewport centre so the surface visibly comes alive on load.
    // While the intro cinematic is armed the splash is DEFERRED — the falling glass drop fires it
    // (via the water:splash event below) at its contact frame, so the drop visibly causes the water.
    if (!introArmed()) {
      disturb(fx(window.innerWidth / 2), fy(window.innerHeight / 2), RIPPLE_FORCE * 2.5, 3);
    }
    // Imperative splash hook for the intro (and anything else): client coords in event detail.
    const onSplash = (e: Event) => {
      const d = (e as CustomEvent<{ x?: number; y?: number }>).detail ?? {};
      const x = d.x ?? window.innerWidth / 2;
      const y = d.y ?? window.innerHeight / 2;
      disturb(fx(x), fy(y), RIPPLE_FORCE * 3.2, 3); // a real impact — slightly stronger than a tap
    };
    window.addEventListener("water:splash", onSplash);

    let frame = 0;
    // Advance the wave field ONE fixed step (ambient impulse + two-buffer propagation + buffer swap).
    const advance = () => {
      // Occasional gentle ambient ripple in the VISIBLE viewport so the water is never quite still.
      if (frame++ % AMBIENT_EVERY === 0) {
        disturb(fx(Math.random() * window.innerWidth), fy(Math.random() * window.innerHeight), AMBIENT_FORCE, 2);
      }
      for (let y = 1; y < rows - 1; y++) {
        const row = y * cols;
        for (let x = 1; x < cols - 1; x++) {
          const i = row + x;
          cur[i] = ((prev[i - 1] + prev[i + 1] + prev[i - cols] + prev[i + cols]) * 0.5 - cur[i]) * DAMP;
        }
      }
      const t = prev;
      prev = cur;
      cur = t; // prev now holds the latest frame
    };
    // Light the surface from the top-left by the diagonal slope of the height field. Crests get a
    // SPECULAR glint (the ramp is squared, so only the steep faces light up — crisp, not a broad
    // emboss); troughs get a faint warm shadow for depth.
    const render = () => {
      const data = img.data;
      for (let y = 0; y < rows; y++) {
        const row = y * cols;
        for (let x = 0; x < cols; x++) {
          const i = row + x;
          const lum =
            ((x > 0 ? prev[i - 1] : prev[i]) - (x < cols - 1 ? prev[i + 1] : prev[i])) +
            ((y > 0 ? prev[i - cols] : prev[i]) - (y < rows - 1 ? prev[i + cols] : prev[i]));
          const o = i * 4;
          if (lum >= 0) {
            const s = Math.min(lum * K_LIGHT, 1);
            data[o] = HI[0]; data[o + 1] = HI[1]; data[o + 2] = HI[2];
            data[o + 3] = s * s * HI_A * 255; // squared → sharp, clean glints
          } else {
            data[o] = LO[0]; data[o + 1] = LO[1]; data[o + 2] = LO[2];
            data[o + 3] = Math.min(-lum * K_SHADE, SH_A) * 255;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    // Run the sim on a FIXED timestep so the wave speed is identical on any refresh rate — a 120Hz
    // Chrome and a 60Hz Safari would otherwise advance the field at different rates (it looked faster
    // on Chrome). Accumulate real elapsed time, take as many 60Hz steps as it buys, then render once.
    const STEP_MS = 1000 / 60;
    let raf = 0;
    let lastT = 0;
    let acc = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (paused()) { lastT = now; acc = 0; return; }
      if (!lastT) lastT = now;
      acc += now - lastT;
      lastT = now;
      if (acc > STEP_MS * 5) acc = STEP_MS * 5; // clamp catch-up after a stall — no spiral of death
      let stepped = false;
      while (acc >= STEP_MS) { acc -= STEP_MS; advance(); stepped = true; }
      if (stepped) render();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("water:splash", onSplash);
      window.removeEventListener("resize", maybeResize);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointermove", onPointerMove, { capture: true });
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("touchend", onTouchEnd, { capture: true });
      window.removeEventListener("touchcancel", onTouchEnd, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: -10 }}
    />
  );
}
