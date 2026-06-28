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
  // Words inked so far. Reduced motion starts fully inked (no animation). This component only ever
  // mounts client-side (inside the open exhibit overlay), so the window check is safe here.
  const [count, setCount] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? words.length : 0,
  );
  const skipRef = useRef(false);

  useEffect(() => {
    if (count >= words.length) return;
    // Pause AFTER the word just inked if it ended in punctuation; otherwise a per-length beat.
    const prev = words[count - 1] ?? "";
    const next = words[count] ?? "";
    const delay = skipRef.current ? 0 : (PAUSE[prev.slice(-1)] ?? BASE + next.length * PER_CHAR);
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
              // Negative insets on all sides so the wipe never clips a tall ascender/descender or the
              // slanted tail of a cursive letter at the end of a word.
              clipPath: i < count ? "inset(-30% -12% -30% -8%)" : "inset(-30% 100% -30% -8%)",
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
