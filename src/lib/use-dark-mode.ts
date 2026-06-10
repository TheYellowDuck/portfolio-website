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

/** Toggle + persist the theme. */
export function setDarkMode(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem("museum:theme", dark ? "dark" : "light"); } catch { /* ignore */ }
}
