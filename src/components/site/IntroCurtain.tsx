// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PERSON } from "@/lib/site";
import { content } from "@/content";
import { PressButton } from "@/components/PressButton";

// The intro curtain covers the first paint and lifts only once the page is actually ready — web
// fonts loaded (the display face is what flickers) — rather than after a fixed timer, so it never
// reveals half-loaded text on a slow connection or lingers on a fast one. A safety timeout
// guarantees readiness even if font loading stalls. Reduced-motion hides it via CSS; no-JS hides
// it via the <noscript> rule in layout.
//
// TOUCH devices gate on a TAP instead of auto-lifting: a "Tap to enter" button (greyed until
// ready) holds the curtain. That tap is a genuine user activation — the one thing iOS accepts for
// DeviceOrientationEvent.requestPermission — so the gyro tilt's motion prompt rides the entry tap
// (via use-tilt's window-level click arming; no wiring needed here). Desktop is unchanged.
const SAFETY_MS = 3500; // consider the page ready regardless if fonts.ready never settles
const FADE_MS = 600;

// Gate on touch, but NOT under reduced-motion: the curtain is display:none there (CSS), so a gate
// would hold an invisible door shut forever (and the gyro is off under reduced-motion anyway).
// Server snapshot is false → the SSR curtain has no button; it appears right after hydration.
const GATE_Q = ["(pointer: coarse)", "(prefers-reduced-motion: reduce)"] as const;
function useGate() {
  return useSyncExternalStore(
    (cb) => {
      const mqls = GATE_Q.map((q) => window.matchMedia(q));
      mqls.forEach((m) => m.addEventListener("change", cb));
      return () => mqls.forEach((m) => m.removeEventListener("change", cb));
    },
    () => window.matchMedia(GATE_Q[0]).matches && !window.matchMedia(GATE_Q[1]).matches,
    () => false,
  );
}

export default function IntroCurtain() {
  const [phase, setPhase] = useState<"shown" | "out" | "gone">("shown");
  const gate = useGate();                    // touch → hold for the tap; desktop → auto-lift
  const [ready, setReady] = useState(false); // fonts loaded (or safety fired) → button enables

  useEffect(() => {
    let cancelled = false;
    // The lift decision reads matchMedia LOCALLY (not the hook's state), so it's already correct
    // even if a warm font cache resolves fonts.ready before React re-renders with `gate`.
    const gated =
      window.matchMedia?.("(pointer: coarse)").matches === true &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const safety = new Promise<void>((r) => setTimeout(r, SAFETY_MS));
    Promise.race([fontsReady, safety]).then(() => {
      if (cancelled) return;
      if (gated) setReady(true); // enable the button; the visitor opens the door
      else setPhase("out");      // desktop: lift on its own, as always
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

  // Unmount after the fade so it leaves nothing behind in the tree.
  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

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
            onClick={() => { if (ready && phase === "shown") setPhase("out"); }}
            disabled={!ready}
            className={`mt-6 rounded-full border px-6 py-2.5 font-mono text-[13px] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 ${
              ready
                ? "border-[rgba(122,158,126,0.6)] bg-[rgba(122,158,126,0.12)] text-pine"
                : "cursor-default border-[rgb(var(--c-line-rgb)_/_0.15)] text-walnut/35"
            }`}
          >
            {content.intro.enter}
          </PressButton>
        )}
      </div>
    </div>
  );
}
