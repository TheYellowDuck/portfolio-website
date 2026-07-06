// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

/** Reactive read of the current theme (tracks the `.dark` class on <html>). */
export function useDarkMode() {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false, // server / pre-hydration default
  );
}

/** Toggle + persist the theme, with a brief cross-fade of all themed colors. */
export function setDarkMode(dark: boolean) {
  const root = document.documentElement;
  const persist = () => { try { localStorage.setItem("museum:theme", dark ? "dark" : "light"); } catch { /* ignore */ } };

  // Preferred path: a View Transition — the browser snapshots old/new and cross-fades ONE
  // composited layer. The legacy fallback below instead puts a transition on EVERY element
  // (a whole-document style-recalc storm that reads as sub-10fps lag on Linux Chrome, where
  // it lands on the main thread no matter how healthy GPU raster is), and the color-scheme
  // flip's instant scrollbar swap shows raw; the snapshot hides both. Duration lives in CSS
  // (::view-transition-old/new(root)). Skipped under reduced motion — the swap is instant there.
  type VT = { finished?: Promise<void> };
  type DocVT = Document & { startViewTransition?: (cb: () => void) => VT };
  const doc = document as DocVT;
  if (typeof doc.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const vt = doc.startViewTransition(() => root.classList.toggle("dark", dark));
    persist();
    // Safari drops the hidden native cursor to the system arrow on a theme swap's recalc; the
    // custom cursor listens for this and re-asserts (WebKit-only — a no-op on other engines).
    window.dispatchEvent(new Event("museum:themechange"));
    vt.finished?.then(() => window.dispatchEvent(new Event("museum:themechange")), () => {});
    return;
  }

  // Fallback: per-element cross-fade via the .theme-transition rule in globals.css.
  root.classList.add("theme-transition");
  root.classList.toggle("dark", dark);
  persist();
  window.dispatchEvent(new Event("museum:themechange"));
  window.setTimeout(() => {
    root.classList.remove("theme-transition");
    window.dispatchEvent(new Event("museum:themechange"));
  }, 400);
}
