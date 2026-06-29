"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// The cursor only makes sense with a precise pointer (mouse/trackpad), and never
// when the user asks for reduced motion. Read reactively so plugging in a mouse or
// toggling the OS setting flips it live — same useSyncExternalStore pattern as
// use-is-mac / use-dark-mode.
const MEDIA = ["(pointer: fine)", "(prefers-reduced-motion: reduce)"] as const;
function subscribeMedia(cb: () => void) {
  const mqls = MEDIA.map((q) => window.matchMedia(q));
  mqls.forEach((m) => m.addEventListener("change", cb));
  return () => mqls.forEach((m) => m.removeEventListener("change", cb));
}
function readEnabled() {
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
function useCursorEnabled() {
  return useSyncExternalStore(subscribeMedia, readEnabled, () => false);
}

// Every non-text clickable. Elements that declare an intent via [data-cursor="Word"]
// get the labelled disc; everything else here gets a small dot. Text-entry fields are
// excluded below so the caret stays native.
const CLICKABLE =
  'a[href], button, [role="button"], [role="link"], summary, label[for], ' +
  ".cursor-pointer, .cursor-grab, .cursor-zoom-in, .cursor-zoom-out, [data-cursor]";

function isEditable(el: Element) {
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

type Mode = "idle" | "dot" | "label";

// A two-tier contextual cursor. The native OS cursor is left alone over text — we only
// take over on clickable things: a small ink dot for generic links/buttons, and an ink
// disc bearing a word ("Open" / "Drag" / "Enter" …) over content that declares one. It
// follows with smooth lerp easing (no spring overshoot) and re-tests what's beneath it on
// scroll, not just on move. Mounted once in the layout, like FaviconSwitcher.
export default function CustomCursor() {
  const enabled = useCursorEnabled();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!enabled) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    document.documentElement.classList.add("has-custom-cursor");

    let tx = -100;
    let ty = -100; // target = real pointer
    let cx = tx;
    let cy = ty; // current = lerped
    let lastX = -100;
    let lastY = -100; // last known pointer, for re-testing on scroll
    let started = false;
    let raf = 0;
    // Mirror the rendered state so we only call setState on an actual change.
    let curMode: Mode = "idle";
    let curLabel = "";

    const apply = (m: Mode, l: string) => {
      if (m !== curMode) {
        curMode = m;
        setMode(m);
      }
      if (l !== curLabel) {
        curLabel = l;
        setLabel(l);
      }
    };
    // Decide the cursor from whatever element is under the pointer.
    const resolve = (el: Element | null) => {
      if (!el) return apply("idle", "");
      const labeled = el.closest("[data-cursor]") as HTMLElement | null;
      if (labeled) return apply("label", labeled.dataset.cursor || "");
      const click = el.closest(CLICKABLE);
      if (click && !isEditable(click)) return apply("dot", "");
      return apply("idle", "");
    };

    // Critically-damped follow: eases toward the pointer and settles, never wobbles.
    const tick = () => {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      wrap.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      tx = lastX = e.clientX;
      ty = lastY = e.clientY;
      if (!started) {
        // Snap to the first position so nothing slides in from a corner.
        started = true;
        cx = tx;
        cy = ty;
      }
      resolve(e.target as Element | null);
    };
    // Scrolling slides elements under a stationary pointer — re-test what's beneath it.
    const onScroll = () => {
      if (started) resolve(document.elementFromPoint(lastX, lastY));
    };
    const clear = () => apply("idle", "");

    const scrollOpts = { passive: true, capture: true } as const;
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, scrollOpts);
    document.addEventListener("pointerleave", clear);
    window.addEventListener("blur", clear);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll, scrollOpts);
      document.removeEventListener("pointerleave", clear);
      window.removeEventListener("blur", clear);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={wrapRef} aria-hidden className="cursor-cur" data-mode={mode}>
      <span className="cursor-cur-dot" />
      <span className="cursor-cur-disc">
        <span className="cursor-cur-word">{label}</span>
      </span>
    </div>
  );
}
