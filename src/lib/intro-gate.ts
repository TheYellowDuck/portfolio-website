// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

// Coordination for the intro curtain's entry gate: while the door is shut, the page holds its
// breath — the water sim is paused (its opening splash waits), and entrance animations (hero
// scramble, scroll reveals, the About typewriter) don't start. Everything releases together on
// the enter click, so the first ripple, the plip, and the text arriving are ONE beat.
//
// Armed synchronously during SiteShell's first client render — before any child mounts or any
// font-ready microtask can fire — so nothing slips through early. When no gate applies (reduced
// motion, or SSR/no-JS where this module never runs), the gate is open and everything behaves
// exactly as if this file didn't exist.

let armed = false;
let released = false;
let resolveGate: (() => void) | undefined;
let gate: Promise<void> | undefined;

/** SiteShell calls this (synchronously, during render) when the curtain WILL gate. */
export function armIntro() {
  if (armed || released) return;
  armed = true;
  gate = new Promise<void>((r) => (resolveGate = r));
}

/** The curtain calls this on the enter click (and as a safety on unmount) — the page exhales. */
export function releaseIntro() {
  if (released) return;
  released = true;
  armed = false;
  resolveGate?.();
}

/** True while the door is shut (WaterBackground pauses on it, frame by frame). */
export function introArmed() {
  return armed;
}

/** Resolves when the page may move: immediately if no gate, at the enter click otherwise. */
export function introGate(): Promise<void> {
  return armed && gate ? gate : Promise.resolve();
}
