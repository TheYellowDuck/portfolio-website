"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";

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
 * Text that writes itself in left-to-right on mount: each character starts blank, briefly scrambles
 * through random glyphs, then locks. DURING the scramble every character sits in a fixed-width slot
 * (measured from its real glyph AFTER web fonts load), so glyph swaps can't change a width — the line
 * can't jitter. The MOMENT it finishes it drops back to plain, naturally-kerned, responsive text, so
 * nothing stays stretched if the viewport (and the fluid font size) changes. The real text is the SSR
 * / no-JS / screen-reader content. Honors prefers-reduced-motion.
 */
export default function ScrambleText({ text, className, delay = 0 }: ScrambleTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, cancelled = false;
    const fontsReady = (typeof document !== "undefined" && document.fonts?.ready) || Promise.resolve();
    fontsReady.then(() => {
      if (cancelled) return;
      if (reduced) { setDone(true); return; }     // reduced motion: just settle to plain text
      const slots = Array.from(root.querySelectorAll<HTMLSpanElement>("[data-ch]"));
      for (const el of slots) {                    // pin each glyph's width (now that fonts are ready)
        el.style.width = `${el.getBoundingClientRect().width}px`;
        el.style.display = "inline-block";
        el.style.textAlign = "center";
        // NB: no `overflow: hidden` — on an inline-block it shifts the baseline to the bottom edge,
        // which changes the line height and makes the block jump in height when it settles to plain text.
      }
      const finals = slots.map((el) => el.dataset.ch ?? "");
      const perChar = SWEEP / Math.max(slots.length, 1);
      const start = performance.now() + delay;
      const tick = (now: number) => {
        let allDone = true;
        for (let i = 0; i < slots.length; i++) {
          const t0 = start + i * perChar;
          if (now < t0) { slots[i].textContent = ""; allDone = false; }                  // not written yet
          else if (now < t0 + SETTLE) { slots[i].textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0]; allDone = false; }
          else slots[i].textContent = finals[i];                                          // locked
        }
        if (allDone) { setDone(true); return; }    // hand off to plain, responsive, kerned text
        raf = requestAnimationFrame(tick);
      };
      tick(performance.now());
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [text, delay]);

  if (done) return <span className={className}>{text}</span>;

  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={className} ref={rootRef} aria-label={text}>
      {words.map((w, wi) => (
        <Fragment key={wi}>
          {wi > 0 ? " " : null}
          <span aria-hidden="true" style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {[...w].map((ch, ci) => (
              <span key={ci} data-ch={ch}>{ch}</span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
