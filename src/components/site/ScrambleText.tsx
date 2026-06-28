"use client";

import { useLayoutEffect, useRef } from "react";

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** ms to wait before this line begins resolving — lets several lines resolve in sequence. */
  delay?: number;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#%&*+=/<>";
const SWEEP = 1100; // ms — the left-to-right window over which characters lock in order
const SETTLE = 420; // ms — how long each character keeps scrambling before it locks to the real one

/**
 * Renders text that, on mount, scrambles every character through random glyphs and resolves to the
 * real text left-to-right. The real text is the SSR / no-JS / screen-reader content (a visually
 * hidden copy carries it for assistive tech); the animation mutates a sibling span's textContent
 * directly each frame — no per-frame React renders — matching Reveal's effect-mutates-the-DOM
 * pattern. Honors prefers-reduced-motion by showing the final text immediately.
 */
export default function ScrambleText({ text, className, delay = 0 }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { el.textContent = text; return; }
    const chars = [...text];
    const perChar = SWEEP / Math.max(chars.length, 1);
    const start = performance.now() + delay;
    let raf = 0;
    const tick = (now: number) => {
      let done = true;
      let out = "";
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (c === " " || c === "\n") { out += c; continue; }       // keep whitespace so wrapping holds
        if (now >= start + i * perChar + SETTLE) { out += c; continue; } // this char has locked
        done = false;
        out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (done) { el.textContent = text; return; }
      raf = requestAnimationFrame(tick);
    };
    tick(performance.now()); // paint a fully-scrambled first frame before the browser paints (no flash)
    return () => cancelAnimationFrame(raf);
  }, [text, delay]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">{text}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
