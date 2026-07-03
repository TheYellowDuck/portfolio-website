// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useState } from "react";
import { PERSON } from "@/lib/site";
import { content } from "@/content";

// The intro curtain covers the first paint and lifts only once the page is actually ready — web
// fonts loaded (the display face is what flickers) — rather than after a fixed timer, so it never
// reveals half-loaded text on a slow connection or linger on a fast one. A safety timeout guarantees
// it never traps a visitor if font loading stalls. Reduced-motion hides it via CSS; no-JS hides it
// via the <noscript> rule in layout. Same on every platform.
const SAFETY_MS = 3500; // lift regardless if fonts.ready never settles
const FADE_MS = 600;

export default function IntroCurtain() {
  const [phase, setPhase] = useState<"shown" | "out" | "gone">("shown");

  // Lift once fonts are ready (or the safety timeout fires).
  useEffect(() => {
    let cancelled = false;
    const ready = document.fonts?.ready ?? Promise.resolve();
    const safety = new Promise<void>((r) => setTimeout(r, SAFETY_MS));
    Promise.race([ready, safety]).then(() => {
      if (!cancelled) setPhase("out");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Unmount after the fade so it leaves nothing behind in the tree.
  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div className={`intro-curtain${phase === "out" ? " intro-curtain--out" : ""}`} aria-hidden>
      <div className="intro-stage">
        <span className="intro-glow" />
        <p className="intro-eyebrow font-mono text-[11px] uppercase tracking-[0.4em] text-pine">
          {content.hero.eyebrow}
        </p>
        <h1 className="intro-name font-display text-[clamp(28px,6vw,46px)] font-semibold tracking-tight text-walnut">
          {PERSON.name}
        </h1>
        <span className="intro-line" />
      </div>
    </div>
  );
}
