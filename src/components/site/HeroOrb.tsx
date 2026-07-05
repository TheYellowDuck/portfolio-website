// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useRef } from "react";
import { createGlassDrop } from "@/lib/glass-drop-gl";

// The drop that started the site, living on: a small glass orb floating by the doorway, gently
// bobbing and leaning a touch toward the pointer. Same renderer as the intro cinematic, so the
// continuity is literal. Decorative only — pointer-events: none, aria-hidden, pauses when
// offscreen or the tab is hidden. Reduced-motion gets a single static frame (still pretty).
const BOB_PX = 0.012;   // vertical bob amplitude, in canvas UV
const BOB_HZ = 0.22;    // slow — museum pace
const LEAN_MAX = 0.6;   // how far the highlights shift toward the pointer

export default function HeroOrb({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const drop = createGlassDrop(canvas);
    if (!drop.ok) { canvas.style.display = "none"; return; }

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    drop.set({ scale: 0.34, point: 0, tilt: 0.12, x: 0.5, y: 0.5, lean: 0 });
    if (reduced) { drop.render(); return; } // one calm, static frame

    let raf = 0;
    let visible = true;
    let lean = 0;
    let leanTarget = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      lean += (leanTarget - lean) * 0.06; // ease toward the pointer, never snap
      drop.set({
        y: 0.5 + BOB_PX * Math.sin((now / 1000) * BOB_HZ * Math.PI * 2),
        lean,
        time: now / 1000,
      });
      drop.render();
    };
    raf = requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(window.innerWidth / 2, 1);
      leanTarget = Math.max(-1, Math.min(1, dx)) * LEAN_MAX;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const onResize = () => drop.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      drop.destroy();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`}
      style={{ width: 96, height: 96 }}
    />
  );
}
