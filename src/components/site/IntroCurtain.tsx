// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PERSON } from "@/lib/site";
import { content } from "@/content";
import { playPlip } from "@/lib/plip";
import { PressButton } from "@/components/PressButton";

// The intro curtain covers the first paint, then GATES on a click/tap: an enter button (greyed
// until the page is actually ready — web fonts loaded, since the display face is what flickers —
// or the safety timer) holds the door on every platform. The entering gesture is a real user
// activation, so it carries the things browsers gate behind one: the water's plip sound plays
// here, and on iOS the gyro-tilt motion prompt rides the same tap (via use-tilt's window-level
// click arming; no wiring needed). Reduced-motion keeps the old auto-lift path — its curtain is
// display:none via CSS, so a gate would hold an invisible door shut (and water/gyro are off
// there anyway). No-JS hides the curtain via the <noscript> rule in layout.
const SAFETY_MS = 3500; // consider the page ready regardless if fonts.ready never settles
const FADE_MS = 600;

// SSR snapshot is false → the server-rendered curtain has no button; it appears at hydration.
function useMedia(query: string, invert = false) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches !== invert,
    () => false,
  );
}

export default function IntroCurtain() {
  const [phase, setPhase] = useState<"shown" | "out" | "gone">("shown");
  const [ready, setReady] = useState(false); // fonts loaded (or safety fired) → button enables
  const gate = useMedia("(prefers-reduced-motion: reduce)", true); // gate everyone except RM
  const touch = useMedia("(pointer: coarse)");
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    // The lift decision reads matchMedia LOCALLY (not the hook's state), so it's already correct
    // even if a warm font cache resolves fonts.ready before React re-renders with `gate`.
    const gated = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const safety = new Promise<void>((r) => setTimeout(r, SAFETY_MS));
    Promise.race([fontsReady, safety]).then(() => {
      if (cancelled) return;
      if (gated) setReady(true); // enable the button; the visitor opens the door
      else setPhase("out");      // reduced-motion: lift on its own (the curtain is hidden anyway)
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // While gating, the page behind must not scroll out from under the closed door.
  useEffect(() => {
    if (!gate || phase !== "shown") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [gate, phase]);

  // Keyboard path: the door is the page's one interactive element while shut — focus it when it
  // unlocks so Enter opens the site without a Tab hunt.
  useEffect(() => {
    if (ready && gate) btnRef.current?.focus({ preventScroll: true });
  }, [ready, gate]);

  // Unmount after the fade so it leaves nothing behind in the tree.
  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const enter = () => {
    if (!ready || phase !== "shown") return;
    playPlip().catch(() => { /* blocked/unsupported — the splash still reads visually */ });
    setPhase("out");
  };

  if (phase === "gone") return null;

  return (
    <div
      className={`intro-curtain${phase === "out" ? " intro-curtain--out" : ""}`}
      aria-hidden={gate ? undefined : true}
      style={gate ? { pointerEvents: "auto" } : undefined}
    >
      <div className="intro-stage">
        <span className="intro-glow" />
        <p className="intro-eyebrow font-mono text-[11px] uppercase tracking-[0.4em] text-pine">
          {content.hero.eyebrow}
        </p>
        <h1 className="intro-name font-display text-[clamp(28px,6vw,46px)] font-semibold tracking-tight text-walnut">
          {PERSON.name}
        </h1>
        <span className="intro-line" />
        {gate && (
          <PressButton
            ref={btnRef}
            onClick={enter}
            disabled={!ready}
            className={`mt-6 rounded-full border px-6 py-2.5 font-mono text-[13px] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 ${
              ready
                ? "border-[rgba(122,158,126,0.6)] bg-[rgba(122,158,126,0.12)] text-pine"
                : "cursor-default border-[rgb(var(--c-line-rgb)_/_0.15)] text-walnut/35"
            }`}
          >
            {touch ? content.intro.enterTouch : content.intro.enterPointer}
          </PressButton>
        )}
      </div>
    </div>
  );
}
