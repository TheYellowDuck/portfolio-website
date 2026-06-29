"use client";

import { forwardRef, useRef } from "react";
import type { ButtonHTMLAttributes, MouseEvent as RMouseEvent, MouseEventHandler, PointerEvent as RPointerEvent } from "react";

// Reliable button activation: fire only when the pointer is pressed down AND released on the SAME
// button — exactly like a native click, but WITHOUT click's quirk of cancelling when the pointer
// micro-moves between press and release (trackpad jitter), which made buttons feel like they
// sometimes did nothing. Pressing somewhere else and releasing over the button does NOT trigger it
// (the press has to start on the button). Keyboard activation (Enter/Space) still works through the
// native click, which fires with `detail === 0` and no preceding pointer sequence.
export function usePressActivate<T extends HTMLElement = HTMLButtonElement>(onActivate?: MouseEventHandler<T>) {
  // The pointerId of a press that began ON this element, or null. Set on pointer-down, cleared once
  // the press resolves (released on the element, dragged off, or cancelled).
  const pressedRef = useRef<number | null>(null);
  // True between a pointer-up activation and the synthetic click that follows it, so we swallow that
  // click rather than firing twice. Reset on every new press.
  const pointerHandledRef = useRef(false);
  return {
    onPointerDown(e: RPointerEvent<T>) {
      if (e.button !== 0) return; // primary mouse / touch / pen only
      pressedRef.current = e.pointerId;
      pointerHandledRef.current = false;
    },
    onPointerUp(e: RPointerEvent<T>) {
      if (pressedRef.current !== e.pointerId) return; // press began off this button → ignore
      pressedRef.current = null;
      pointerHandledRef.current = true; // swallow the click that the browser fires right after
      onActivate?.(e); // a React PointerEvent is a MouseEvent, so handlers reading the event still work
    },
    onPointerLeave(e: RPointerEvent<T>) {
      if (pressedRef.current === e.pointerId) pressedRef.current = null; // dragged off before release
    },
    onPointerCancel(e: RPointerEvent<T>) {
      if (pressedRef.current === e.pointerId) pressedRef.current = null;
    },
    onClick(e: RMouseEvent<T>) {
      // A pointer press already activated on pointer-up above → swallow its trailing click.
      if (pointerHandledRef.current) { pointerHandledRef.current = false; return; }
      // Otherwise this is a keyboard activation (Enter/Space) or a click the pointer path missed (e.g.
      // a tap the browser canceled). A native click already requires press AND release on the same
      // button, so honouring it here keeps "down and up on the button" without the micro-drag misses.
      onActivate?.(e);
    },
  };
}

/**
 * Drop-in replacement for `<button>` that activates reliably (see `usePressActivate`). Pass the
 * activation handler as `onClick` exactly like a normal button; every other button prop (className,
 * style, aria-*, disabled, type, children, …) is forwarded untouched. Any pointer handlers you also
 * pass are composed after the internal ones.
 */
export const PressButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function PressButton({ onClick, onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, ...rest }, ref) {
    const press = usePressActivate<HTMLButtonElement>(onClick);
    return (
      <button
        ref={ref}
        {...rest}
        onPointerDown={(e) => { press.onPointerDown(e); onPointerDown?.(e); }}
        onPointerUp={(e) => { press.onPointerUp(e); onPointerUp?.(e); }}
        onPointerLeave={(e) => { press.onPointerLeave(e); onPointerLeave?.(e); }}
        onPointerCancel={(e) => { press.onPointerCancel(e); onPointerCancel?.(e); }}
        onClick={press.onClick}
      />
    );
  },
);
