// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useLayoutEffect, useRef } from "react";
import { introGate } from "@/lib/intro-gate";

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
 * through random glyphs, then locks. The REAL text always holds the layout — width, line wrapping,
 * kerning, height — so nothing about the box ever changes (the scramble is painted as an absolutely
 * positioned overlay measured at each character's real on-screen position, which can't shift the
 * surrounding text). It's perfectly kerned and responsive throughout and the instant it finishes.
 * Honors prefers-reduced-motion (real text, no animation). SSR / no-JS / screen readers get the text.
 */
export default function ScrambleText({ text, className, delay = 0 }: ScrambleTextProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current, textEl = textRef.current;
    if (!wrap || !textEl) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return; // leave the real text
    const node = textEl.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;

    let raf = 0, cancelled = false;
    const overlays: { el: HTMLSpanElement; ch: string }[] = [];
    const fontsReady = (typeof document !== "undefined" && document.fonts?.ready) || Promise.resolve();
    // Also wait for the intro curtain's enter click (a no-op when it isn't gating) — otherwise the
    // scramble would play silently behind the opaque curtain and reveal already-finished text.
    Promise.all([fontsReady, introGate()]).then(() => {
      if (cancelled) return;
      // Measure each non-space character's box (after fonts load) and drop an absolutely-positioned
      // overlay span exactly over it. The overlays carry the scramble; the real text underneath is
      // only hidden (ink, not layout), so width / wrapping / height never change.
      const wrapRect = wrap.getBoundingClientRect();
      const range = document.createRange();
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " " || text[i] === "\n") continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        // For the first character of a soft-wrapped line, getBoundingClientRect unions a phantom
        // zero-width rect at the previous line's end with the real glyph rect — putting the overlay a
        // line too high. Take the real (non-zero-width) glyph rect instead.
        const rects = Array.from(range.getClientRects()).filter((rr) => rr.width > 0);
        const r = rects[rects.length - 1] ?? range.getBoundingClientRect();
        const el = document.createElement("span");
        el.setAttribute("aria-hidden", "true");
        // Anchor each glyph CENTERED on its character's centre at natural width — so it lands exactly
        // where the real letter is (matching its baseline via line-height) without clipping narrow
        // letters to slivers or letting wide ones shove their neighbours.
        el.style.cssText =
          `position:absolute;left:${r.left + r.width / 2 - wrapRect.left}px;top:${r.top - wrapRect.top}px;` +
          `height:${r.height}px;line-height:${r.height}px;transform:translateX(-50%);white-space:pre;`;
        wrap.appendChild(el);
        overlays.push({ el, ch: text[i] });
      }
      if (overlays.length === 0) return;
      textEl.style.visibility = "hidden"; // hide the real ink, keep its layout
      const perChar = SWEEP / overlays.length;
      const start = performance.now() + delay;
      const tick = (now: number) => {
        let allDone = true;
        for (let i = 0; i < overlays.length; i++) {
          const t0 = start + i * perChar;
          if (now < t0) { overlays[i].el.textContent = ""; allDone = false; }
          else if (now < t0 + SETTLE) { overlays[i].el.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0]; allDone = false; }
          else overlays[i].el.textContent = overlays[i].ch;
        }
        if (allDone) { for (const o of overlays) o.el.remove(); textEl.style.visibility = ""; return; }
        raf = requestAnimationFrame(tick);
      };
      tick(performance.now());
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); for (const o of overlays) o.el.remove(); textEl.style.visibility = ""; };
  }, [text, delay]);

  return (
    <span ref={wrapRef} className={`theme-fade-self ${className ?? ""}`} style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
      <span ref={textRef} aria-hidden="true">{text}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
