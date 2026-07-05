// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

// Coordination for the 3D glass-drop intro (IntroCinematic). While the cinematic covers the page,
// entrance animations (the hero ScrambleText lines) must NOT play — they'd finish silently behind
// the opaque overlay. Anything with an entrance awaits `introGate()`; when no cinematic runs the
// gate is already open, so behavior is exactly as before.
//
// Arming happens synchronously during SiteShell's first client render — BEFORE any child mounts or
// any font-ready microtask can fire — so there is no frame where a scramble can slip through early.

let armed = false;
let released = false;
let resolveGate: (() => void) | undefined;
let gate: Promise<void> | undefined;

/** SiteShell calls this (synchronously, during render) when the cinematic WILL play. */
export function armIntro() {
  if (armed || released) return;
  armed = true;
  gate = new Promise<void>((r) => (resolveGate = r));
}

/** The cinematic calls this at the contact frame — every gated entrance starts now. */
export function releaseIntro() {
  released = true;
  resolveGate?.();
}

/** True while the cinematic owns the first paint (WaterBackground defers its opening splash). */
export function introArmed() {
  return armed && !released;
}

/** Resolves when entrances may play: immediately if no cinematic, at the contact frame otherwise. */
export function introGate(): Promise<void> {
  return armed && !released && gate ? gate : Promise.resolve();
}
