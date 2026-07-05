// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useRef } from "react";
import { useDarkMode } from "@/lib/use-dark-mode";

// Caustic lamplight over the hero: thin, slowly-breathing filaments of warm light — the look of
// golden-hour light passing through water — drifting across the parchment behind the hero content.
// Pure atmosphere: no objects, extremely faint (a second-read moment), never blocking anything.
//
// Same construction philosophy as WaterBackground: a COARSE grid drawn into a tiny canvas that CSS
// upscales (soft by nature, cheap by construction), advanced on a fixed timestep, paused when
// offscreen or the tab is hidden. Skipped entirely under prefers-reduced-motion.
const CELL = 10;         // px per pattern cell (coarse: the upscale is what makes it soft)
const FPS = 24;          // caustics breathe — they don't need 60Hz
const SPEED = 0.22;      // pattern drift rate — museum pace
// Theme-aware ink: WARM LIGHT filaments are invisible on light parchment (light-on-light), so the
// light theme draws the caustic web as faint walnut-ink refraction lines instead — like light
// through water casting onto paper. Dark theme keeps glowing lamplight filaments.
const DARK_COLOR = [240, 206, 120] as const;  // lamplight (#f0ce78)
const DARK_ALPHA = 0.16;
const LIGHT_COLOR = [58, 46, 30] as const;    // walnut ink
const LIGHT_ALPHA = 0.11;

export default function CausticLight({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dark = useDarkMode();

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    let cols = 0, rows = 0;
    let img = ctx.createImageData(1, 1);
    const resize = () => {
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      cols = Math.max(4, Math.ceil(w / CELL));
      rows = Math.max(4, Math.ceil(h / CELL));
      canvas.width = cols;
      canvas.height = rows;
      img = ctx.createImageData(cols, rows);
    };
    resize();

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Interference of a few slow waves; brightness rides the zero-crossings raised to a power,
    // which is what draws the thin caustic web rather than broad blobs.
    const [cr, cg, cb] = dark ? DARK_COLOR : LIGHT_COLOR;
    const alphaMax = dark ? DARK_ALPHA : LIGHT_ALPHA;
    const draw = (tSec: number) => {
      const t = tSec * SPEED;
      const data = img.data;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const v =
            Math.sin(x * 0.32 + t) +
            Math.sin(y * 0.41 - t * 1.31) +
            Math.sin((x + y) * 0.21 + t * 0.67) +
            Math.sin(Math.sqrt(x * x + y * y) * 0.29 - t * 0.93);
          const n = 1 - Math.min(Math.abs(v) * 0.5, 1);       // 1 at a crossing, 0 far away
          const b = n * n * n * n * n * n;                     // ^6 → thin filaments
          const o = (y * cols + x) * 4;
          data[o] = cr; data[o + 1] = cg; data[o + 2] = cb;
          data[o + 3] = b * alphaMax * 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    const STEP = 1000 / FPS;
    let raf = 0, last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      if (now - last < STEP) return;
      last = now;
      draw(now / 1000);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [dark]);

  const mask = "radial-gradient(120% 90% at 50% 32%, black 45%, transparent 98%)";
  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`}
      style={{ width: "100%", height: "100%", maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}
