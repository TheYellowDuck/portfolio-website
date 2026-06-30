"use client";

import { useLayoutEffect, useRef } from "react";

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
 * The full text is the SSR / no-JS / screen-reader content (rendered up front, carried on aria-label),
 * so search engines and assistive tech always get it. The animation mutates the segment spans'
 * textContent directly — no per-frame React state — matching Reveal's effect-mutates-the-DOM pattern.
 * Honors prefers-reduced-motion by leaving everything shown.
 *
 * The box grows naturally as it types (the typewriter look). But once it has scrolled ABOVE the
 * viewport, each newly-wrapped line would shove the content you're now reading downward — so we
 * compensate the page scroll by the exact growth, keeping your position locked.
 */
export default function Typewriter({ segments, className, speed = 13 }: TypewriterProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const caretRef = useRef<HTMLSpanElement>(null);
  const full = segments.map((s) => s.text).join("");

  useLayoutEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return; // leave full text shown
    const root = rootRef.current;
    const spans = spanRefs.current;
    const caret = caretRef.current;
    const total = full.length;
    // Reveal `c` characters, distributed across the styled segments.
    const reveal = (c: number) => {
      let consumed = 0;
      for (let i = 0; i < segments.length; i++) {
        const len = segments[i].text.length;
        if (spans[i]) spans[i]!.textContent = segments[i].text.slice(0, Math.max(0, Math.min(len, c - consumed)));
        consumed += len;
      }
    };
    reveal(0);                              // hide before the browser paints (no flash of the full text)
    if (caret) caret.style.display = "none";

    const scroller = document.scrollingElement ?? document.documentElement;
    let lastH = root?.offsetHeight ?? 0;
    let count = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const type = () => {
      if (count >= total) { if (caret) caret.style.display = "none"; return; }
      reveal(count + 1);
      // If a line just wrapped, the box grew. When it's entirely above the viewport, undo the push by
      // scrolling the same amount — so what you're reading below doesn't jump.
      if (root) {
        const h = root.offsetHeight;
        if (h !== lastH) {
          if (root.getBoundingClientRect().bottom <= 0) scroller.scrollTop += h - lastH;
          lastH = h;
        }
      }
      const justTyped = full[count];
      count += 1;
      const delay = PAUSE[justTyped] != null ? PAUSE[justTyped] : speed + Math.random() * speed;
      timer = setTimeout(type, delay);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (caret) caret.style.display = "";
        lastH = root?.offsetHeight ?? lastH; // baseline from the collapsed (pre-typing) box
        type();
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    if (root) io.observe(root);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [segments, full, speed]);

  return (
    <span className={className} ref={rootRef} aria-label={full}>
      {segments.map((s, i) => (
        <span key={i} ref={(el) => { spanRefs.current[i] = el; }} className={s.className} aria-hidden="true">{s.text}</span>
      ))}
      <span ref={caretRef} className="tw-caret" aria-hidden="true" style={{ display: "none" }}>▍</span>
    </span>
  );
}
