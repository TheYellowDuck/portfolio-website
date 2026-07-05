// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useRef, useState } from "react";
import { createGlassDrop } from "@/lib/glass-drop-gl";
import { releaseIntro } from "@/lib/intro-gate";

// First-load 3D moment: a clean glass water drop GROWS from nothing over the bare parchment,
// forms its point as it FALLS to the viewport centre (the view tilting to top-down), shrinks with
// depth, and lands exactly where WaterBackground's ripple blooms — one continuous cause-and-effect
// that reveals the site. Live-rendered (no video): the ripple starts the very frame the drop lands.
//
// Restraint by design (the Apple lesson): ONE move, one speed, quintic easing throughout.
//
// Runs once per session. Skipped by prefers-reduced-motion, missing WebGL, or any input (tap /
// key / wheel jumps straight to the contact beat). A safety timeout guarantees the site can never
// stay hidden. SiteShell only mounts this when the cinematic is armed (see intro-gate.ts).
const DURATION_MS = 2600;
const GROW_END = 0.34;    // fraction of the timeline: the orb grows in …
const BEAT_END = 0.44;    // … holds a breath at full size …
const POINT_BY = 0.62;    // … and its point is fully formed this far into the timeline (mid-fall)
const FADE_MS = 520;      // overlay cross-fade after contact
const SAFETY_MS = 6000;   // absolute ceiling — release everything even if rAF never runs
const SPLASH_EVENT = "water:splash";

/** Quintic smootherstep — zero velocity and acceleration at both ends (the "expensive" ramp). */
const smoother = (t: number) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export const INTRO_SEEN_KEY = "museum:intro3d";

export default function IntroCinematic({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drop = createGlassDrop(canvas);
    let raf = 0;
    let done = false;

    // Contact: ripple + reveal + fade, exactly once — from timeline end, any input, or the safety net.
    const contact = (fireSplash: boolean) => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* ignore */ }
      if (fireSplash) {
        window.dispatchEvent(new CustomEvent(SPLASH_EVENT, {
          detail: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        }));
      }
      releaseIntro();
      setFading(true);
      setTimeout(onDone, FADE_MS);
    };

    if (!drop.ok) { contact(false); return; } // no WebGL → instant reveal, keep the splash for load feel

    const start = performance.now();
    const tick = (now: number) => {
      if (done) return;
      const t = Math.min((now - start) / DURATION_MS, 1);

      if (t < GROW_END) {
        // grow from nothing, high in the frame, straight-on
        const g = smoother(t / GROW_END);
        drop.set({ scale: 0.16 * g, point: 0, tilt: 0, x: 0.5, y: 0.72, time: now / 1000 });
      } else if (t < BEAT_END) {
        // a breath at full size — you see the whole orb before anything moves
        drop.set({ scale: 0.16, point: 0, tilt: 0, x: 0.5, y: 0.72, time: now / 1000 });
      } else {
        // ONE combined move: fall to centre + point forms + view tilts top-down + depth shrink
        const f = smoother((t - BEAT_END) / (1 - BEAT_END));
        const pointT = smoother(Math.min((t - BEAT_END) / (POINT_BY - BEAT_END), 1));
        drop.set({
          scale: 0.16 * (1 - 0.62 * f),
          point: pointT * (1 - 0.55 * f), // the point melts back toward round as the view goes overhead
          tilt: f,
          x: 0.5,
          y: 0.72 + (0.5 - 0.72) * f,
          time: now / 1000,
        });
      }
      drop.render();
      if (t >= 1) { contact(true); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Any input skips straight to the landing (impatience is a valid preference).
    const skip = () => contact(true);
    window.addEventListener("pointerdown", skip, { capture: true });
    window.addEventListener("keydown", skip, { capture: true });
    window.addEventListener("wheel", skip, { capture: true, passive: true });
    const onResize = () => drop.resize();
    window.addEventListener("resize", onResize);
    const safety = window.setTimeout(() => contact(true), SAFETY_MS);

    // No scrolling while the drop owns the screen (it's ~2.6s, and any input skips anyway).
    document.body.classList.add("intro-cinematic-active");

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      window.removeEventListener("pointerdown", skip, { capture: true });
      window.removeEventListener("keydown", skip, { capture: true });
      window.removeEventListener("wheel", skip, { capture: true });
      window.removeEventListener("resize", onResize);
      document.body.classList.remove("intro-cinematic-active");
      drop.destroy();
    };
  }, [onDone]);

  return (
    <div className={`intro-cinematic${fading ? " intro-cinematic--out" : ""}`} aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
