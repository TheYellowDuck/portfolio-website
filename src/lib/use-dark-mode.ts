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
  root.classList.add("theme-transition");
  root.classList.toggle("dark", dark);
  try { localStorage.setItem("museum:theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  // A theme swap's style recalc (and the color-scheme flip) makes some browsers — Safari
  // notably — drop the displayed native cursor to the system arrow for a frame or two. Tell
  // the custom cursor to re-assert its hide so it resolves back as fast as possible — once at
  // the toggle, once after the transition class is removed (the two recalc points).
  window.dispatchEvent(new Event("museum:themechange"));
  window.setTimeout(() => {
    root.classList.remove("theme-transition");
    window.dispatchEvent(new Event("museum:themechange"));
  }, 400);
}
