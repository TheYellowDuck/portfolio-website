"use client";

import { useEffect, useRef, useState } from "react";

export interface TypeSegment {
  text: string;
  /** Styling for this run of text (e.g. the "Off the clock —" label keeps its own look). */
  className?: string;
}

interface TypewriterProps {
  /** Styled runs typed in order, so a label and prose can share one continuous typing pass. */
  segments: TypeSegment[];
  className?: string;
  /** Base ms per character; a little jitter is added so the cadence feels human. */
  speed?: number;
}

// Longer pauses after sentence / clause punctuation so it reads like someone typing and thinking.
const PAUSE: Record<string, number> = {
  ".": 360, "!": 360, "?": 360, "…": 380,
  ",": 170, ";": 200, ":": 200, "—": 260, "–": 220,
  "\n": 300,
};

/**
 * Types its text out character-by-character when it scrolls into view (once), pausing on punctuation.
 * The FULL text is the SSR / no-JS / screen-reader content (carried on aria-label and rendered up
 * front), so search engines and assistive tech always get it; the mount effect resets to empty and
 * types once the block is in view. Honors prefers-reduced-motion by showing everything immediately.
 */
export default function Typewriter({ segments, className, speed = 13 }: TypewriterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const full = segments.map((s) => s.text).join("");
  const total = full.length;
  const [count, setCount] = useState(total); // SSR / pre-hydration: the whole thing
  const [armed, setArmed] = useState(false);

  // On mount: reduced motion keeps the full text; otherwise clear it and arm typing on scroll-in.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setCount(total); return; }
    setCount(0);
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setArmed(true); io.disconnect(); } },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [total]);

  // Reveal the next character after a delay that lengthens following punctuation.
  useEffect(() => {
    if (!armed || count >= total) return;
    const prev = full[count - 1];
    const delay = count > 0 && PAUSE[prev] != null ? PAUSE[prev] : speed + Math.random() * speed;
    const t = setTimeout(() => setCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [armed, count, total, full, speed]);

  let consumed = 0;
  return (
    <span className={className} aria-label={full}>
      <span ref={ref} aria-hidden="true">
        {segments.map((s, i) => {
          const visible = Math.max(0, Math.min(s.text.length, count - consumed));
          consumed += s.text.length;
          return <span key={i} className={s.className}>{s.text.slice(0, visible)}</span>;
        })}
        {armed && count < total && <span className="tw-caret">▍</span>}
      </span>
    </span>
  );
}
