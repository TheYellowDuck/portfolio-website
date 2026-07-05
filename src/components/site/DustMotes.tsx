// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useRef } from "react";

// Dust motes floating in the doorway's lamplight — the cozy museum-air detail. A handful of tiny
// warm specks drift slowly upward with a gentle sway; each is brightest inside the light cone
// (top-centre, widening downward) and fades toward the dark corners, so the light beam itself is
// what you read, not "particles". Slow twinkle keeps them alive without ever being busy.
//
// Cheap: one small canvas, ~16 arcs at 30fps, paused when offscreen / hidden tab / game covering
// the page. Skipped under prefers-reduced-motion (static specks would just read as dirt).
const COUNT = 24;
const FPS = 30;
const WARM = "240, 206, 120"; // lamplight (#f0ce78)

interface Mote {
  x: number;      // 0..1 across the panel
  y: number;      // 0..1 down the panel
  z: number;      // depth: 0.35 (far, small, dim) .. 1 (near)
  speed: number;  // upward px/s (scaled by depth)
  swayAmp: number;
  swayHz: number;
  phase: number;
  twinkleHz: number;
}

export default function DustMotes({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    let w = 1, h = 1, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, canvas.clientWidth);
      h = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Spawn biased toward the centre line (two-roll average), where the lamplight falls.
    const motes: Mote[] = Array.from({ length: COUNT }, () => ({
      x: (Math.random() + Math.random()) / 2,
      y: Math.random(),
      z: 0.35 + Math.random() * 0.65,
      speed: 2 + Math.random() * 3.5,
      swayAmp: 3 + Math.random() * 5,
      swayHz: 0.08 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
      twinkleHz: 0.15 + Math.random() * 0.25,
    }));

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const paused = () => !visible || document.hidden || document.body.classList.contains("game-active");

    const STEP = 1000 / FPS;
    let raf = 0, last = 0, prev = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (paused()) { prev = now; return; }
      if (now - last < STEP) return;
      last = now;
      const dt = Math.min((now - prev) / 1000, 0.1);
      prev = now;

      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      for (const m of motes) {
        m.y -= (m.speed * m.z * dt) / h;             // drift upward, nearer motes a touch faster
        if (m.y < -0.03) { m.y = 1.03; m.x = (Math.random() + Math.random()) / 2; }
        const px = m.x * w + Math.sin(t * m.swayHz * Math.PI * 2 + m.phase) * m.swayAmp * m.z;
        const py = m.y * h;
        // Lamplight cone from top-centre, widening downward: bright on-axis and high, dim elsewhere.
        const axis = Math.abs(px / w - 0.5) / (0.16 + 0.55 * m.y);
        const beam = Math.max(0, 1 - axis) * (1 - m.y * 0.5);
        if (beam <= 0.02) continue;
        const twinkle = 0.7 + 0.3 * Math.sin(t * m.twinkleHz * Math.PI * 2 + m.phase * 1.7);
        ctx.beginPath();
        ctx.arc(px, py, 0.8 + m.z * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${WARM}, ${(0.85 * beam * m.z * twinkle).toFixed(3)})`;
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
