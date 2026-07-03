// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
const detect = () =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || "");

/** True on macOS/iOS — for showing ⌘ vs Ctrl in shortcut hints. */
export function useIsMac() {
  return useSyncExternalStore(noop, detect, () => false);
}
