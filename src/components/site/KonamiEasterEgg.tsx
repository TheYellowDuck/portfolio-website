"use client";

import { useEffect, useRef, useState } from "react";

// ↑ ↑ ↓ ↓ ← → ← → B A — works on any keyboard / OS (arrow keys + letters).
const SEQUENCE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a",
];

// duck.png is a 15×22 grid of 32px frames; row 3 (0-based) is "stand idle".
const SHEET_COLS = 15;
const SHEET_ROWS = 22;
const DUCK_ROW = 3;
const LIFETIME_MS = 7300; // must exceed the slowest duck (max delay + dur below)

interface DuckCfg { left: number; size: number; dur: number; delay: number; sway: number; spin: number; }

const signed = (min: number, max: number) => (min + Math.random() * (max - min)) * (Math.random() < 0.5 ? -1 : 1);

export default function KonamiEasterEgg({ enabled = true }: { enabled?: boolean }) {
  const [ducks, setDucks] = useState<DuckCfg[] | null>(null);
  const idx = useRef(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) { idx.current = 0; return; }
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === SEQUENCE[idx.current]) {
        idx.current += 1;
        if (idx.current === SEQUENCE.length) {
          idx.current = 0;
          // Randomness lives in the event handler (never during render).
          setDucks(Array.from({ length: 16 }, () => ({
            left: Math.random() * 100,
            size: 30 + Math.random() * 30,
            dur: 4.5 + Math.random() * 1.5, // 4.5–6s
            delay: Math.random() * 1,        // 0–1s  → max total 7s < LIFETIME
            sway: signed(14, 40),
            spin: signed(8, 30),
          })));
          if (timer.current) clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setDucks(null), LIFETIME_MS);
        }
      } else {
        idx.current = key === SEQUENCE[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!ducks) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 80 }} aria-hidden>
      {ducks.map((d, i) => (
        <div
          key={i}
          className="absolute top-0 will-change-transform"
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            backgroundImage: "url(/assets/sprites/duck.png)",
            backgroundRepeat: "no-repeat",
            backgroundSize: `${SHEET_COLS * d.size}px ${SHEET_ROWS * d.size}px`,
            backgroundPosition: `0px ${-DUCK_ROW * d.size}px`,
            imageRendering: "pixelated",
            ["--sway" as string]: `${d.sway.toFixed(1)}px`,
            ["--spin" as string]: `${d.spin.toFixed(1)}deg`,
            animation: `konami-fall ${d.dur.toFixed(2)}s ease-in-out ${d.delay.toFixed(2)}s forwards`,
          } as React.CSSProperties}
        />
      ))}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-[rgba(122,158,126,0.5)] bg-[rgb(var(--c-bg-rgb)_/_0.95)] px-5 py-2.5 font-mono text-[13px] text-walnut shadow-[0_8px_30px_rgba(28,21,8,0.3)]"
        style={{ animation: `konami-toast ${(LIFETIME_MS / 1000).toFixed(1)}s ease forwards` }}
      >
        🦆 Konami unlocked — there&apos;s a real duck hiding in the museum.
      </div>
    </div>
  );
}
