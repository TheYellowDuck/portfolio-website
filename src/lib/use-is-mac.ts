"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
const detect = () =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || "");

/**
 * True on macOS/iOS — for showing ⌘ vs Ctrl in shortcut hints. Hydration-safe
 * (server renders the non-Mac default, client corrects after mount).
 */
export function useIsMac() {
  return useSyncExternalStore(noop, detect, () => false);
}
