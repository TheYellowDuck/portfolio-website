"use client";

import { Fragment, useEffect, useRef, useState } from "react";

/* The Curator's Note, "written out" word by word in a handwriting face. Each word reveals with a
   left-to-right ink wipe (clip-path) so it reads like a pen laying the words down, pausing a beat on
   punctuation. Reduced motion shows it all at once. Tap to finish instantly. */

// Longer pauses after sentence / clause punctuation, like a hand pausing mid-thought.
const PAUSE: Record<string, number> = { ".": 360, "!": 360, "?": 360, "…": 380, ",": 150, ";": 180, ":": 180, "—": 230 };
const BASE = 70;     // ms between words (plus a bit per letter, so longer words take longer to "write")
const PER_CHAR = 13;
const WIPE_MS = 165; // ms each word takes to ink in

export default function HandwrittenNote({ text, className }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  const [count, setCount] = useState(0); // words inked so far
  const skipRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setCount(words.length);
  }, [words.length]);

  useEffect(() => {
    if (count >= words.length) return;
    const w = words[count] ?? "";
    const delay = skipRef.current ? 0 : (PAUSE[w.slice(-1)] ?? BASE + w.length * PER_CHAR);
    const t = setTimeout(() => setCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [count, words]);

  return (
    <div className={className} onClick={() => { skipRef.current = true; setCount(words.length); }}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span
            style={{
              display: "inline-block",
              // -25% top/bottom so tall ascenders / descenders are never clipped by the horizontal wipe.
              clipPath: i < count ? "inset(-25% 0% -25% 0%)" : "inset(-25% 100% -25% 0%)",
              transition: `clip-path ${WIPE_MS}ms linear`,
            }}
          >
            {w}
          </span>{" "}
        </Fragment>
      ))}
    </div>
  );
}
