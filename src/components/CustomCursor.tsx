// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

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

const MAGNET_PULL = 1.0; // how far toward a magnetic element's centre the cursor is drawn
// "Button-like" = short, even if wide — this catches pill/text buttons (e.g. "Step inside",
// "This Portfolio's Source") while still excluding tall panels like the minimap or a card.
const MAGNET_MAX_W = 360; // px — magnetic up to this wide …
const MAGNET_MAX_H = 72; //  … as long as it's no taller than this

// A two-tier contextual cursor. The native cursor is left alone over text; over anything
// clickable we show a small ink dot, and over content that opts in with [data-cursor] the
// dot blooms into an ink disc bearing a word. It follows with smooth lerp easing, snaps
// onto compact plain buttons (magnetism — skipped on popup/zoom triggers so it never yanks
// toward something that's about to open), dips on press, and re-tests what's beneath it on
// scroll — not just on move. Mounted once in the layout, like FaviconSwitcher.
export default function CustomCursor() {
  const enabled = useCursorEnabled();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [label, setLabel] = useState("");
  const [pressed, setPressed] = useState(false);

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
    let themeRaf = 0;
    let hidden = false; // faded out while the page is scrolling
    let scrollEndTimer = 0;
    // Magnet target (centre of a compact hovered element), in viewport coords.
    let magnetOn = false;
    let magnetX = 0;
    let magnetY = 0;
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
    // Compact elements (small in both dimensions) feel magnetic; large ones (cards, the
    // doorway) keep the cursor exactly under the pointer so precision is never lost.
    const setMagnet = (el: Element) => {
      const r = el.getBoundingClientRect();
      magnetOn = r.width <= MAGNET_MAX_W && r.height <= MAGNET_MAX_H;
      if (magnetOn) {
        magnetX = r.left + r.width / 2;
        magnetY = r.top + r.height / 2;
      }
    };
    // Disabled controls read as non-interactive — the greyed door button must not show the dot,
    // and must flip live when it enables (the mutation retest below re-resolves it).
    const isDisabled = (el: Element) => el.matches(":disabled, [aria-disabled='true']");
    // Decide the cursor from whatever element is under the pointer.
    const resolve = (el: Element | null) => {
      if (el) {
        const labeled = el.closest("[data-cursor]") as HTMLElement | null;
        if (labeled && !isDisabled(labeled)) {
          // Labelled = a popup/zoom/drag trigger (project, skill, doorway, résumé…).
          // The disc still shows, but no magnet — the cursor stays under the pointer
          // so it doesn't yank toward the centre of something that's about to open.
          apply("label", labeled.dataset.cursor || "");
          magnetOn = false;
          return;
        }
        const click = el.closest(CLICKABLE);
        if (click && !isEditable(click) && !isDisabled(click)) {
          // Plain button / link → magnetic (if compact).
          apply("dot", "");
          setMagnet(click);
          return;
        }
      }
      apply("idle", "");
      magnetOn = false;
    };

    // Critically-damped follow: eases toward the (optionally magnetised) target, never wobbles. The
    // ease is TIME-based (exp of dt / time-constant) so the follow feels identical on 60Hz and 120Hz —
    // a fixed per-frame factor would catch up ~2x faster on a high-refresh display.
    const FOLLOW_TAU = 75; // ms — matches the old 0.2-per-frame feel at 60fps
    let lastT = 0;
    const tick = (now: number) => {
      const dt = lastT ? Math.min(now - lastT, 100) : 1000 / 60;
      lastT = now;
      const k = 1 - Math.exp(-dt / FOLLOW_TAU);
      const gx = magnetOn ? tx + (magnetX - tx) * MAGNET_PULL : tx;
      const gy = magnetOn ? ty + (magnetY - ty) * MAGNET_PULL : ty;
      cx += (gx - cx) * k;
      cy += (gy - cy) * k;
      wrap.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const root = document.documentElement;
    const show = () => {
      if (hidden) {
        hidden = false;
        wrap.removeAttribute("data-hidden"); // fade the custom dot/disc back in …
        root.classList.remove("cursor-scroll-hide"); // … and restore the native cursor
      }
    };
    const hide = () => {
      if (!hidden) {
        hidden = true;
        wrap.setAttribute("data-hidden", ""); // hide the custom dot/disc …
        root.classList.add("cursor-scroll-hide"); // … and the native arrow over everything
      }
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
      show(); // any real pointer movement brings the cursor back
      resolve(e.target as Element | null);
    };
    // While scrolling, hide the cursor entirely — it would otherwise float over content
    // sliding past. Once scrolling settles, re-test what's now under the pointer, then show.
    // The DOM can change UNDER a stationary pointer — a button enables, the curtain fades out
    // after its click, a popup opens/closes, an orb turns pointer-events:none. Pointer events
    // won't fire for any of that, so watch for mutations (structure + interactivity attributes —
    // NOT style, which animations write every frame) and re-test what's beneath the pointer,
    // debounced so entrance-animation bursts cost one hit-test per beat instead of hundreds.
    let retestTimer = 0;
    const retest = () => {
      if (retestTimer) return;
      retestTimer = window.setTimeout(() => {
        retestTimer = 0;
        if (!started || hidden || document.hidden) return;
        resolve(document.elementFromPoint(lastX, lastY));
      }, 120);
    };
    const mo = new MutationObserver(retest);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "data-cursor", "class", "hidden"],
    });

    const onScroll = () => {
      if (!started) return;
      hide();
      clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(() => {
        resolve(document.elementFromPoint(lastX, lastY));
        show();
      }, 120);
    };
    const clear = () => {
      apply("idle", "");
      magnetOn = false;
    };
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    // After a theme swap, WebKit drops the hidden native cursor to the system arrow for a
    // frame or two on the recalc, until the next mouse move. Re-assert the hide by toggling
    // the gating class atomically (with a reflow between) so WebKit re-resolves it. Do it NOW
    // — synchronously, before the toggle's own paint, so the cursor can stay hidden from that
    // very frame (shortest possible) — and again next frame as a fallback once the recalc lands.
    const reassertHide = () => {
      root.classList.remove("has-custom-cursor");
      void root.offsetWidth;
      root.classList.add("has-custom-cursor");
    };
    // The dropped-cursor bug this works around is WebKit's; the double forced reflow is pure
    // cost on other engines (it was amplifying the Linux Chrome theme-swap jank), so gate it.
    const isWebKit = "GestureEvent" in window;
    const refreshCursor = () => {
      if (!isWebKit) return;
      reassertHide();
      cancelAnimationFrame(themeRaf);
      themeRaf = requestAnimationFrame(reassertHide);
    };
    // Returning to a backgrounded tab: the follow rAF may have been dropped while hidden, a
    // scroll-hide could be left applied, and the displayed native cursor can revert. The REAL
    // pointer position is unknown until it next moves, so don't restore at the stale position
    // (that looks stuck/wrong). Reset to a clean idle state — started=false makes the first move
    // SNAP the cursor to where the pointer actually is (no fly-across) — restart the loop, clear
    // any leftover hide, and re-assert the native hide.
    const onVisible = () => {
      if (document.hidden) return;
      started = false;
      apply("idle", "");
      show();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
      refreshCursor();
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    // Non-capture: only the page scroll, so the auto-drifting archive carousel and
    // other nested scrollers don't keep hiding the cursor when the pointer is elsewhere.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    document.addEventListener("pointerleave", clear);
    window.addEventListener("blur", up);
    window.addEventListener("blur", clear);
    window.addEventListener("museum:themechange", refreshCursor);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mo.disconnect();
      clearTimeout(retestTimer);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(themeRaf);
      clearTimeout(scrollEndTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.removeEventListener("pointerleave", clear);
      window.removeEventListener("blur", up);
      window.removeEventListener("blur", clear);
      window.removeEventListener("museum:themechange", refreshCursor);
      document.removeEventListener("visibilitychange", onVisible);
      document.documentElement.classList.remove("has-custom-cursor");
      document.documentElement.classList.remove("cursor-scroll-hide");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={wrapRef} aria-hidden className="cursor-cur" data-mode={mode} data-pressed={pressed || undefined}>
      <div className="cursor-cur-scale">
        <span className="cursor-cur-dot" />
        <span className="cursor-cur-disc">
          <span className="cursor-cur-word">{label}</span>
        </span>
      </div>
    </div>
  );
}
