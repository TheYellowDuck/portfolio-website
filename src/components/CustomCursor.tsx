"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// Elements that make the ring "grab" — grow + fill — so the cursor reads as
// interactive over them. Mirrors the cursor-pointer utilities used across the
// site; add [data-cursor="grow"] to opt anything else in.
const INTERACTIVE =
  'a, button, [role="button"], summary, label, input, select, textarea, .cursor-pointer, [data-cursor="grow"]';

// Spring lag for the trailing ring — light + quick so it feels alive, not floaty.
const RING_SPRING = { stiffness: 380, damping: 30, mass: 0.5 } as const;

// The custom cursor only makes sense with a precise pointer (mouse/trackpad),
// and never when the user asks for reduced motion. Read reactively so plugging
// in a mouse or toggling the OS setting flips it without a reload — same
// useSyncExternalStore pattern as use-is-mac / use-dark-mode.
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

// A precise dot rides the real pointer; a softer ring trails behind it and swells
// over interactive elements. Color comes from --c-accent, so it flips with the
// light/dark theme automatically. Mounted once in the layout (like FaviconSwitcher).
export default function CustomCursor() {
  const enabled = useCursorEnabled();

  // Raw pointer position — the dot sits here exactly.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // The ring follows the same target through a spring, so it lags and settles.
  const ringX = useSpring(x, RING_SPRING);
  const ringY = useSpring(y, RING_SPRING);

  const [visible, setVisible] = useState(false); // hide until first move / off-screen
  const [active, setActive] = useState(false); // hovering something interactive
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-custom-cursor");

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true); // React bails out once it's already true
    };
    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      setActive(!!target?.closest?.(INTERACTIVE));
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const hide = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("blur", onUp);
    document.addEventListener("pointerleave", hide);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("blur", onUp);
      document.removeEventListener("pointerleave", hide);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const ringScale = pressed ? 0.7 : active ? 1.8 : 1;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-2147483646">
      {/* Trailing ring — lags via spring, swells over interactive elements. */}
      <motion.div
        className="absolute top-0 left-0"
        style={{ x: ringX, y: ringY, opacity: visible ? 1 : 0 }}
      >
        <motion.div
          className="rounded-full border"
          style={{
            width: 30,
            height: 30,
            marginLeft: -15,
            marginTop: -15,
            borderColor: "var(--c-accent)",
            willChange: "transform",
          }}
          animate={{
            scale: ringScale,
            backgroundColor: active ? "var(--c-accent)" : "rgba(0,0,0,0)",
            opacity: active ? 0.18 : 0.55,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.4 }}
        />
      </motion.div>

      {/* Precise dot — rides the real pointer exactly. */}
      <motion.div
        className="absolute top-0 left-0"
        style={{ x, y, opacity: visible ? 1 : 0 }}
      >
        <div
          className="rounded-full"
          style={{
            width: 6,
            height: 6,
            marginLeft: -3,
            marginTop: -3,
            backgroundColor: "var(--c-accent)",
          }}
        />
      </motion.div>
    </div>
  );
}
