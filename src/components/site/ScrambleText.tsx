"use client";

import { Fragment, useLayoutEffect, useRef } from "react";

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** ms to wait before this line begins resolving — lets several lines resolve in sequence. */
  delay?: number;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=/<>";
const SWEEP = 1000; // ms — the left-to-right window over which characters lock in order
const SETTLE = 300; // ms — how long each character scrambles before it locks (small ⇒ a tight wave)

/**
 * Text that, on mount, writes itself in left-to-right: each character starts blank, briefly scrambles
 * through random glyphs, then locks to the real letter. Every character sits in a fixed-width slot
 * (measured from its real glyph), so swapping glyphs NEVER changes a width — the line can't jitter or
 * reflow, matching the clean look of the constant-width (mono) lines. Words stay unbroken; spaces are
 * real wrap points. The real text is the SSR / no-JS / screen-reader content. Honors reduced motion.
 */
export default function ScrambleText({ text, className, delay = 0 }: ScrambleTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return; // leave the real text shown
    const slots = Array.from(root.querySelectorAll<HTMLSpanElement>("[data-ch]"));
    // Pin each character's slot to its real width so glyph swaps can't move anything.
    for (const el of slots) {
      el.style.width = `${el.getBoundingClientRect().width}px`;
      el.style.display = "inline-block";
      el.style.overflow = "hidden";
      el.style.textAlign = "center";
      el.style.whiteSpace = "pre";
    }
    const finals = slots.map((el) => el.dataset.ch ?? "");
    const perChar = SWEEP / Math.max(slots.length, 1);
    const start = performance.now() + delay;
    let raf = 0;
    const tick = (now: number) => {
      let done = true;
      for (let i = 0; i < slots.length; i++) {
        const t0 = start + i * perChar;
        if (now < t0) { slots[i].textContent = ""; done = false; }          // not written yet
        else if (now < t0 + SETTLE) { slots[i].textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0]; done = false; }
        else slots[i].textContent = finals[i];                              // locked
      }
      if (done) return;
      raf = requestAnimationFrame(tick);
    };
    tick(performance.now()); // paint the first frame before the browser paints (no flash of full text)
    return () => cancelAnimationFrame(raf);
  }, [text, delay]);

  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={className} ref={rootRef}>
      {words.map((w, wi) => (
        <Fragment key={wi}>
          {wi > 0 ? " " : null}
          <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {[...w].map((ch, ci) => (
              <span key={ci} data-ch={ch}>{ch}</span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
