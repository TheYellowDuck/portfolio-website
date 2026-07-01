"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEventHandler } from "react";
import { motion, AnimatePresence, LayoutGroup, type HTMLMotionProps } from "framer-motion";
import { useDarkMode } from "@/lib/use-dark-mode";
import { categoryColor } from "@/lib/skill-colors";
import { usePressActivate } from "@/components/PressButton";
import Reveal from "./Reveal";

// A motion.button that activates only on a press that both starts and ends on it (reliable clicks,
// robust to trackpad micro-drag) — same semantics as PressButton, but for framer-motion so the orbs
// keep their layout/tap animations. Each instance owns its own press state, so dragging from one orb
// and releasing on another never triggers the wrong one.
function PressMotionButton({
  onActivate,
  ...rest
}: HTMLMotionProps<"button"> & { onActivate?: MouseEventHandler<HTMLButtonElement> }) {
  const press = usePressActivate<HTMLButtonElement>(onActivate);
  return <motion.button {...rest} {...press} />;
}

export interface SkillBlobGroup {
  title: string;
  description?: string;
  items: string[];
}

const longestWord = (s: string) => Math.max(...s.split(/\s+/).map((w) => w.length));
const CHIP_GAP = 6;          // px between chip rows (gap-1.5) — also the seam between the two copies
const SCROLL_SPEED = 25;     // px/s cruising drift speed
const SCROLL_DELAY = 600;    // ms of stillness after opening / after manual scroll before it drifts
const SCROLL_RAMP = 1100;    // ms to ease the speed up on (re)start AND down to a stop on hover

// The zoom-to-centre scroll runs on the SAME duration + easing as the orb's layout morph, so the two
// move as one motion (with matching curves the orb's on-screen path is a clean line to the centre).
const ZOOM_MS = 500;
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 1 - 3 * x2 + 3 * x1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 1 - 3 * y2 + 3 * y1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const fy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {            // solve fx(t)=x (Newton), then return fy(t)
    let t = x;
    for (let i = 0; i < 5; i++) { const d = dfx(t); if (Math.abs(d) < 1e-6) break; t -= (fx(t) - x) / d; }
    return fy(Math.max(0, Math.min(1, t)));
  };
}
const ZOOM_EASE = cubicBezier(0.22, 1, 0.36, 1); // == the orb morph's ease

// Shared chip look — identical to the project cards, so a skill reads the same everywhere.
const CHIP_CLASS = "rounded border px-2 py-0.5 font-mono text-[11px]";
// Soft top/bottom edge fade for the scrolling chip band, so chips dissolve in/out instead of clipping.
// Percentage-based + multi-stop (eased) for a long, seamless dissolve that scales with the orb.
const SCROLL_FADE =
  "linear-gradient(to bottom," +
  " transparent 0%, rgba(0,0,0,0.12) 2%, rgba(0,0,0,0.5) 5%, #000 9%," +
  " #000 91%, rgba(0,0,0,0.5) 95%, rgba(0,0,0,0.12) 98%, transparent 100%)";
// Soft top/bottom dissolve for the dim+blur backdrop so it doesn't read as a hard-edged rectangle
// over the field. Its left/right run off-screen (w-screen), so only the top/bottom edges would show;
// masking the element fades the backdrop-blur too, not just the tint — no crisp blur boundary.
const DIM_FADE = "linear-gradient(to bottom, transparent 0%, #000 18%, #000 82%, transparent 100%)";

// Paper disc with a soft top sheen + deeper underside, plus the group's hue (from skillColorFor) as a
// top-down wash on the surface. Dark needs a touch more wash to read on the dark surface.
const discStyle = (hue: number, dark: boolean) =>
  dark
    ? {
        background:
          `radial-gradient(circle at 50% 32%, rgba(255,255,255,0.06), rgba(255,255,255,0) 55%),` +
          `radial-gradient(circle at 50% 118%, rgba(0,0,0,0.34), rgba(0,0,0,0) 56%),` +
          `radial-gradient(125% 92% at 50% 0%, hsla(${hue}, 55%, 55%, 0.22), rgba(0,0,0,0) 76%), var(--c-surface)`,
        boxShadow:
          `inset 0 1px 1px rgba(255,255,255,0.07), inset 0 -9px 18px rgba(0,0,0,0.34),` +
          `0 9px 22px -12px rgba(0,0,0,0.5), 0 30px 54px -42px rgba(0,0,0,0.45)`,
      }
    : {
        background:
          `radial-gradient(circle at 50% 36%, rgba(255,255,255,0.5), rgba(255,255,255,0) 54%),` +
          `radial-gradient(circle at 50% 114%, rgba(58,46,30,0.06), rgba(58,46,30,0) 56%),` +
          `radial-gradient(125% 90% at 50% 0%, hsla(${hue}, 50%, 45%, 0.16), rgba(255,255,255,0) 76%), var(--c-surface)`,
        boxShadow:
          `inset 0 1.5px 2px rgba(255,255,255,0.6), inset 0 -8px 16px rgba(58,46,30,0.05),` +
          `0 9px 20px -12px rgba(58,46,30,0.16), 0 28px 50px -42px rgba(58,46,30,0.13)`,
      };

interface Node { i: number; x: number; y: number; r: number; lw: number }

// Gravity-to-centre + full collision resolution (no edge clamp) -> compact, NON-overlapping field,
// then scaled to fit the container width. Sized strictly by item count.
function packField(groups: SkillBlobGroup[], width: number, mobile: boolean) {
  const base = mobile ? 26 : 30;
  const gap = mobile ? 7 : 10;
  const nodes: Node[] = groups.map((g, i) => ({ i, r: base + 9 * Math.sqrt(g.items.length), lw: longestWord(g.title), x: 0, y: 0 }));
  // Desktop: spread WIDE (use the horizontal space). Mobile: compress horizontally into a narrow,
  // tall column so the cluster fits the viewport width WITHOUT being scaled down (which would shrink
  // every orb, and its label, to an unreadable size).
  const gx = mobile ? 0.12 : 0.05, gy = mobile ? 0.045 : 0.09;
  const avg = nodes.reduce((s, n) => s + n.r, 0) / nodes.length;
  nodes.forEach((n, i) => { const a = i * 2.39996, rad = avg * 1.25 * Math.sqrt(i + 0.6); n.x = Math.cos(a) * rad; n.y = Math.sin(a) * rad; });
  const collide = () => {
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
      const A = nodes[a], B = nodes[b];
      let dx = B.x - A.x, dy = B.y - A.y;
      const d = Math.hypot(dx, dy) || 0.01, m = A.r + B.r + gap;
      if (d < m) { const o = (m - d) / d / 2; dx *= o; dy *= o; A.x -= dx; A.y -= dy; B.x += dx; B.y += dy; }
    }
  };
  for (let it = 0; it < 560; it++) { nodes.forEach((n) => { n.x -= n.x * gx; n.y -= n.y * gy; }); collide(); }
  for (let it = 0; it < 80; it++) collide();
  let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
  nodes.forEach((n) => { mnX = Math.min(mnX, n.x - n.r); mxX = Math.max(mxX, n.x + n.r); mnY = Math.min(mnY, n.y - n.r); mxY = Math.max(mxY, n.y + n.r); });
  const cw = mxX - mnX || 1, ch = mxY - mnY || 1, scale = Math.min(1, width / cw), height = ch * scale;
  nodes.forEach((n) => { n.r *= scale; n.x = (n.x - mnX) * scale + (width - cw * scale) / 2; n.y = (n.y - mnY) * scale; });
  return { nodes, height };
}

// Expanded-orb radius: GROWS with the group's skill count so every chip fits at one consistent
// readable size (the densest groups then scroll a little inside the orb). Capped to the container
// width. The content area is kept to the circle's inscribed square so chips never clip on the curve.
function orbRadius(items: string[], mobile: boolean, width: number) {
  const fc = mobile ? 11 : 11.5;
  const rowH = fc + 14;
  const area = items.reduce((a, it) => a + (it.length * fc * 0.6 + 26) * rowH, 0);
  const side = Math.sqrt(area / 0.46);          // content square that holds the wrapped chips + title
  const R = side / 0.6 / 2 + 30;                // → circle radius (square fits inside, plus margin)
  const maxR = mobile ? (width - 16) / 2 : Math.min(width * 0.44, 320);
  return Math.max(mobile ? 122 : 152, Math.min(maxR, R));
}

export default function SkillBlobs({ groups, note }: { groups: SkillBlobGroup[]; note?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [inView, setInView] = useState(false);
  const [trackH, setTrackH] = useState(0);
  const dark = useDarkMode();
  const mobile = width > 0 && width < 640;
  const expandedR = active !== null && groups[active] ? orbRadius(groups[active].items, mobile, width) : 0;
  const loop = active !== null && trackH > expandedR + 4;   // auto-scroll only when chips overflow
  // The disks pop in in a scattered (non-left-to-right) order so the field "populates" organically.
  // A pure per-index hash (stable, not Math.random in render) keeps it lint-clean and deterministic.
  const entryDelays = useMemo(
    () => Array.from({ length: groups.length }, (_, i) => { const v = Math.sin(i * 12.9898 + 4.137) * 43758.5453; return (v - Math.floor(v)) * 0.55; }),
    [groups.length],
  );
  const reduceMotion = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  // Entry animation is driven by scroll-into-view and REPLAYS every time the field re-enters view, so
  // the disks visibly rise up + populate each time. Under reduced motion we skip the observer entirely
  // and the render treats the field as always in view (no entrance animation).
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [active]);
  // Zoom should bring the orb to the middle of the screen as ONE motion with the orb morph: on open,
  // remember the scroll position and scroll so the (centred) expanded orb sits at the viewport centre;
  // on close, return. The scroll is hand-animated on the orb morph's curve/duration (per-frame
  // behavior:"instant" so the page's CSS smooth-scroll doesn't fight it). The container's top is fixed
  // (it only grows downward), so we centre on its FINAL height; there's plenty of page below, so the
  // target is always reachable.
  const savedScroll = useRef(0);
  const prevActive = useRef<number | null>(null);
  const scrollRaf = useRef(0);
  useEffect(() => {
    const wasOpen = prevActive.current !== null;
    const isOpen = active !== null;
    const reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const scrollToY = (targetY: number) => {
      cancelAnimationFrame(scrollRaf.current);
      const startY = window.scrollY, dist = targetY - startY;
      if (reduce || Math.abs(dist) < 1) { window.scrollTo({ top: targetY, left: 0 }); return; }
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ZOOM_MS);
        window.scrollTo({ top: startY + dist * ZOOM_EASE(t), left: 0, behavior: "instant" });
        if (t < 1) scrollRaf.current = requestAnimationFrame(step);
      };
      scrollRaf.current = requestAnimationFrame(step);
    };
    if (isOpen) {
      // savedScroll is captured in the open click handler. Centre the orb (which sits at the centre of
      // the fixed-height section) by measuring the section box directly.
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const topDoc = rect.top + window.scrollY;
        scrollToY(Math.max(0, topDoc + rect.height / 2 - window.innerHeight / 2));
      }
    } else if (wasOpen) {
      scrollToY(savedScroll.current);
    }
    prevActive.current = active;
    return () => cancelAnimationFrame(scrollRaf.current);
  }, [active]);
  // Measure one copy of the chip list (so the loop wraps by exactly one copy + gap → seamless).
  // ResizeObserver is a subscription, so no synchronous set-state-in-effect.
  useEffect(() => {
    const el = copyRef.current;
    if (active === null || !el) return;
    const ro = new ResizeObserver(([e]) => setTrackH(e.contentRect.height));
    ro.observe(el); return () => ro.disconnect();
  }, [active]);
  // TRUE infinite scroll: the chip list is duplicated and the track is translated by `pos`, which
  // wraps with modulo — so it loops endlessly in BOTH directions (auto-drift and manual wheel/touch)
  // and never hits a top/bottom. Auto-drift eases up after a short delay and slows to a stop on hover;
  // reduced motion keeps manual scroll but drops the auto-drift.
  useEffect(() => {
    const vp = viewportRef.current, track = trackRef.current;
    if (active === null || !loop || !vp || !track) return;
    const period = trackH + CHIP_GAP;
    const reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const tau = SCROLL_RAMP / 3;                            // exp-smoothing time constant for the ease
    let raf = 0, prev = 0, lastInteract = 0, hovering = false, vel = 0, pos = 0, touchY = 0;
    const wrap = () => { pos = ((pos % period) + period) % period; };
    const apply = () => { track.style.transform = `translateY(${-pos}px)`; };
    const nudge = (dy: number) => { pos += dy; wrap(); apply(); lastInteract = performance.now(); };
    const step = (t: number) => {
      if (!prev) { prev = t; lastInteract = t; }            // count the delay from the moment it opens
      const dt = Math.min(64, t - prev); prev = t;
      const target = !hovering && t - lastInteract > SCROLL_DELAY ? 1 : 0;   // vel eases UP on start, DOWN on hover
      vel += (target - vel) * (1 - Math.exp(-dt / tau));
      if (vel > 0.001) { pos += (SCROLL_SPEED * vel * dt) / 1000; wrap(); apply(); }
      raf = requestAnimationFrame(step);
    };
    const onEnter = () => { hovering = true; };
    const onLeave = () => { hovering = false; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); nudge(e.deltaY); };
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; lastInteract = performance.now(); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); const y = e.touches[0].clientY; nudge(touchY - y); touchY = y; };
    vp.addEventListener("mouseenter", onEnter);
    vp.addEventListener("mouseleave", onLeave);
    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("touchstart", onTouchStart, { passive: true });
    vp.addEventListener("touchmove", onTouchMove, { passive: false });
    apply();
    if (!reduce) raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      vp.removeEventListener("mouseenter", onEnter);
      vp.removeEventListener("mouseleave", onLeave);
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("touchstart", onTouchStart);
      vp.removeEventListener("touchmove", onTouchMove);
    };
  }, [active, loop, trackH]);

  const layout = useMemo(() => (width > 0 ? packField(groups, width, mobile) : null), [groups, width, mobile]);
  // The section keeps the packed-field height even while an orb is open (the orb expands centred over
  // it), so opening/closing NEVER changes the document height — which would otherwise shift the scroll
  // out from under the zoom-to-centre animation and stop it landing back at the right spot.
  const containerH = layout ? layout.height : 360;

  return (
    <>
      <ul className="sr-only">
        {groups.map((g) => <li key={g.title}>{g.title}: {g.items.join(", ")}</li>)}
      </ul>

      {/* Wrap the blob field AND the note so the close backdrop can cover both. */}
      <div className="relative w-full">
      <div ref={ref} className="relative w-full" aria-hidden style={{ height: containerH }}>
        <LayoutGroup>
          {layout && groups.map((g, i) => {
            const nd = layout.nodes[i];
            if (!nd) return null;
            const sc = categoryColor(g.title);
            // Label scales to the orb: fits its longest word to a share of the diameter. On mobile the
            // orbs are small, so a long word hit the 7.5px MINIMUM and spilled to the edge; a lower
            // floor + slightly tighter fit lets it actually shrink to leave breathing room there.
            const fs = Math.max(mobile ? 6 : 8.5, Math.min((nd.r * 2 * (mobile ? 0.72 : 0.8)) / (nd.lw * 0.62), nd.r * 0.34, mobile ? 12 : 14));
            return (
              <PressMotionButton
                key={g.title}
                layoutId={`blob-${i}`}
                onActivate={() => { if (active === null) savedScroll.current = window.scrollY; setActive(active === i ? null : i); }}
                initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.85 }}
                animate={
                  active !== null
                    ? { opacity: active === i ? 0 : 0.07, y: 0, scale: 1 }
                    : inView || reduceMotion
                      ? { opacity: 1, y: 0, scale: 1 }            // rise up into place
                      : { opacity: 0, y: 40, scale: 0.85 }        // reset below view so it replays
                }
                transition={{
                  layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  default: { type: "spring", stiffness: 220, damping: 22, delay: active === null && inView && !reduceMotion ? (entryDelays[i] ?? 0) : 0 },
                }}
                whileHover={active === null ? { y: -4, scale: 1.035 } : undefined}
                whileTap={active === null ? { scale: 0.96 } : undefined}
                className="absolute flex items-center justify-center overflow-hidden rounded-full font-sans font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                style={{
                  left: nd.x - nd.r, top: nd.y - nd.r, width: nd.r * 2, height: nd.r * 2,
                  ...discStyle(sc.hue, dark), color: dark ? sc.solidDark : sc.solid, fontSize: fs, lineHeight: 1.16, letterSpacing: "-0.005em",
                  pointerEvents: active !== null ? "none" : "auto",
                }}
                aria-label={`${g.title}, ${g.items.length} skills`}
                data-cursor="Expand"
              >
                <span className="flex h-[84%] w-[84%] flex-col items-center justify-center gap-1 text-center" style={{ overflowWrap: "normal", wordBreak: "normal" }}>
                  <span>{g.title}</span>
                  <span className="font-mono text-[10px] opacity-55">{g.items.length}</span>
                </span>
              </PressMotionButton>
            );
          })}

          {/* Zoom: the clicked blob morphs (shared layoutId) into a centred orb. Both the dim backdrop
              and the orb sit BELOW the sticky nav (z-10 < nav's z-20), so scrolling tucks them under
              the header instead of over it. */}
          <AnimatePresence>
            {active !== null && groups[active] && (() => {
              const g = groups[active];
              const sc = categoryColor(g.title);
              const tint = dark ? sc.solidDark : sc.solid;
              const titleFs = Math.max(14, Math.min(expandedR * 0.17, (expandedR * 2 * 0.62) / (longestWord(g.title) * 0.6), 26));
              // All pills share the group's category colour, so the open orb reads as one coherent set.
              const chips = g.items.map((item) => (
                <span key={item} className={CHIP_CLASS} style={{ borderColor: sc.border, background: sc.bg, color: dark ? sc.solidDark : sc.solid }}>{item}</span>
              ));
              const chipRow = "flex w-full flex-wrap content-start justify-center gap-1.5";
              return (
                <>
                  <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ pointerEvents: "none" }}>
                    <motion.div
                      layoutId={`blob-${active}`}
                      onClick={() => setActive(null)}
                      transition={{ layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
                      className="flex cursor-zoom-out flex-col items-center justify-center overflow-hidden rounded-full"
                      style={{ width: expandedR * 2, height: expandedR * 2, ...discStyle(sc.hue, dark), pointerEvents: "auto" }}
                    >
                      <motion.div
                        className="flex min-h-0 flex-col items-center justify-center"
                        style={{ maxWidth: expandedR * 1.36, maxHeight: expandedR * 1.4 }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, delay: 0.16 }}
                      >
                        <h3 className="shrink-0 text-center font-sans font-semibold leading-tight" style={{ color: tint, fontSize: titleFs }}>{g.title}</h3>
                        <div
                          ref={viewportRef}
                          className="mt-3 w-full overflow-hidden overscroll-contain"
                          style={{
                            maxHeight: expandedR,
                            touchAction: loop ? "none" : undefined,
                            ...(loop ? { maskImage: SCROLL_FADE, WebkitMaskImage: SCROLL_FADE } : {}),
                          }}
                        >
                          <div ref={trackRef} className="flex flex-col items-center gap-1.5" style={{ willChange: loop ? "transform" : undefined }}>
                            <div ref={copyRef} className={chipRow}>{chips}</div>
                            {loop && <div aria-hidden className={chipRow}>{chips}</div>}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </>
              );
            })()}
          </AnimatePresence>
        </LayoutGroup>
      </div>

      {note && (
        <Reveal variant="fade">
          <p className="mx-auto mt-7 max-w-[60ch] text-center font-mono text-[11px] leading-relaxed text-walnut/55">{note}</p>
        </Reveal>
      )}

      {/* Close zone. The dim+blur (z-0) covers ONLY the blob field, so the note below stays sharp
          and readable. A separate TRANSPARENT catcher (z-1) extends the clickable close range
          full-width: UP over the section heading (-top-40), across the field + note, and a bit
          below it — click anywhere there to close. Both sit below the centred orb (z-10) and the
          sticky nav (z-20). */}
      <AnimatePresence>
        {active !== null && (
          <>
            <motion.div
              key="skills-dim" aria-hidden
              className="absolute top-0 left-1/2 z-0 w-screen -ml-[50vw]"
              style={{ height: containerH, background: "rgb(var(--c-bg-rgb) / 0.66)", backdropFilter: "blur(7px)", maskImage: DIM_FADE, WebkitMaskImage: DIM_FADE }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <PressMotionButton
              key="skills-catcher" aria-label="Close" onActivate={() => setActive(null)}
              data-cursor="Close"
              className="absolute -top-40 -bottom-24 left-1/2 z-[1] w-screen -ml-[50vw] cursor-zoom-out"
            />
          </>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
