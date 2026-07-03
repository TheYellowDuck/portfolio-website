// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, MouseEvent as RMouseEvent, MouseEventHandler } from "react";

// A plain <button> wrapper.
//
// History: this used to intercept pointer-down/up to "activate on press-and-release" (robust to
// trackpad micro-drag). That extra layer caused click/focus quirks in practice — notably tab/button
// states that didn't visually reset after a click — so it now just uses the native click, which every
// browser already handles correctly. The component (and `usePressActivate`) are kept so the many
// callers don't have to change.
export function usePressActivate<T extends HTMLElement = HTMLButtonElement>(onActivate?: MouseEventHandler<T>) {
  return { onClick: (e: RMouseEvent<T>) => onActivate?.(e) };
}

/**
 * Drop-in replacement for `<button>`. Pass the handler as `onClick` exactly like a normal button;
 * every other prop (className, style, aria-*, disabled, type, children, …) is forwarded untouched.
 */
export const PressButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function PressButton(props, ref) {
    return <button ref={ref} {...props} />;
  },
);
