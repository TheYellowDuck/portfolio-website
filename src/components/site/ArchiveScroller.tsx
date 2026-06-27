"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import type { ExhibitPopup } from "@/data/projects";
import { videoPoster } from "@/lib/video";
import { skillColorFor } from "@/lib/skill-colors";
import { useDarkMode } from "@/lib/use-dark-mode";
import { LazyVideo } from "./ProjectCard";

// Mobile (<640px) gets a swipeable card deck; wider screens get the auto-scrolling rail.
const MOBILE_Q = "(max-width: 639px)";
function useIsMobile() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(MOBILE_Q); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(MOBILE_Q).matches,
    () => false,
  );
}

/* The archive is a sideways rail that auto-advances like a carousel: it centres a card, holds for
   a few seconds, then glides quickly to centre the next — looping forever. Cards are rendered in 3
   copies so the active card always has neighbours on both sides; the active window stays in the
   middle copy (wrapped by one set's width, so the loop is seamless). Edges fade into the page via a
   CSS mask. Pure CSS fade + one lightweight rAF (no canvas); pauses on hover/drag, off-screen, and
   under reduced-motion. */
const FADE = 60; // px — width of the edge fade at each border
const DWELL = 3000; // ms — hold on each centred card
const MOVE = 850; // ms — glide to the next card (longer = smoother)
const IDLE = 700; // ms — after interacting (drag/wheel/touch), wait this long, then settle + resume

interface ArchiveItem {
  popup: ExhibitPopup;
  index: string; // e.g. "09"
}

interface ArchiveScrollerProps {
  items: ArchiveItem[];
  onOpen: (popup: ExhibitPopup) => void;
}

const ytId = (popup: ExhibitPopup) => popup.embedUrl?.match(/embed\/([\w-]+)/)?.[1];

/** Media pane — set height, width follows the clip's own aspect ratio (so videos are never cropped
 *  and never letterboxed). YouTube cards default to 16:9; local clips use their poster's aspect. */
function CardMedia({ popup, aspect }: { popup: ExhibitPopup; aspect: number }) {
  const id = ytId(popup);
  return (
    <div
      className="relative h-full shrink-0 overflow-hidden bg-black/5"
      style={{ aspectRatio: String(aspect) }}
    >
      {popup.videoUrl ? (
        <LazyVideo src={popup.videoUrl} poster={videoPoster(popup.videoUrl)} className="h-full w-full object-cover" />
      ) : id ? (
        <>
          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(https://img.youtube.com/vi/${id}/hqdefault.jpg)` }} />
          <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-walnut shadow-lg">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </>
      ) : null}
    </div>
  );
}

function ArchiveCard({ item, aspect, onOpen }: { item: ArchiveItem; aspect: number; onOpen: () => void }) {
  const { popup, index } = item;
  const dark = useDarkMode();
  const hasMedia = !!(popup.videoUrl || popup.embedUrl);
  return (
    <article
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`Open ${popup.title ?? "project"}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="group flex h-[260px] shrink-0 cursor-pointer items-stretch overflow-hidden rounded-xl border border-[rgb(var(--c-line-rgb)/0.12)] bg-surface transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(122,158,126,0.6)] hover:shadow-[0_12px_30px_rgba(28,21,8,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
    >
      {hasMedia && <CardMedia popup={popup} aspect={aspect} />}
      <div className={`flex min-w-0 flex-col px-5 py-4 ${hasMedia ? "w-[244px] sm:w-[272px]" : "w-[300px]"}`}>
        <span className="font-mono text-[11px] tracking-[0.22em] text-pine">No. {index}</span>
        <h3 className="mt-1.5 line-clamp-2 font-display text-[17px] font-semibold leading-snug text-pine">{popup.title}</h3>
        {popup.description && (
          <p className="mt-2 line-clamp-4 flex-1 font-sans text-[13px] leading-relaxed text-walnut/80 dark:leading-[1.6]">
            {popup.description}
          </p>
        )}
        {popup.tech && popup.tech.length > 0 && (
          <div className="mt-3 flex h-[22px] flex-wrap gap-1.5 overflow-hidden">
            {popup.tech.slice(0, 3).map((t) => {
              const c = skillColorFor(t);
              return (
                <span key={t} className="rounded border px-2 py-0.5 font-mono text-[10px]" style={{ borderColor: c.border, background: c.bg, color: dark ? c.solidDark : c.solid }}>{t}</span>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Horizontal rail for the archive — the lowest-priority work, so it gets a tight, sideways
 * footprint. Auto-scrolls in a seamless infinite loop (cards rendered twice, scrollLeft wrapped),
 * with edges fading into the page. Pauses on hover/drag; manual mouse drag-to-scroll.
 */
function Rail({ items, onOpen }: ArchiveScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [aspects, setAspects] = useState<Record<number, number>>({});

  // Measure each local clip's aspect from its poster so the media keeps its real shape.
  useEffect(() => {
    items.forEach((it, i) => {
      if (!it.popup.videoUrl) return;
      const src = videoPoster(it.popup.videoUrl);
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setAspects((a) => (a[i] ? a : { ...a, [i]: img.naturalWidth / img.naturalHeight }));
        }
      };
      img.src = src;
    });
  }, [items]);

  // Manual drag state + "actively interacting" window (timestamp until which we pause).
  const drag = useRef<{ startX: number; lastX: number; moved: boolean } | null>(null);
  const touchX = useRef(0);
  const interactUntil = useRef(0);
  const idxRef = useRef(items.length); // active card, persisted so re-renders never reset position
  const bump = () => { interactUntil.current = performance.now() + IDLE; };

  // Auto-advancing carousel: centre a card → dwell → glide to the next, looping seamlessly.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const N = items.length;
    if (N === 0) return;
    let oneSet = 0; // width of one copy (distance from copy A's first card to copy B's first card)
    let low = 0; // scrollLeft that centres the middle copy's first card — start of the wrap band
    const center = (i: number) => { const c = el.children[i] as HTMLElement; return c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2; };
    const measure = () => { const k = el.children; if (k.length > N) { oneSet = (k[N] as HTMLElement).offsetLeft - (k[0] as HTMLElement).offsetLeft; low = center(N); } };
    // Keep MANUAL scroll inside one copy's band [low, low+oneSet); shifting by a whole copy is
    // invisible (the copies are identical), so dragging/scrolling loops forever. Skipped during
    // auto-advance — the auto path re-anchors itself exactly (offsetLeft rounding across copies
    // means low+oneSet isn't pixel-exact, so relying on this listener there scrolls backward).
    const wrap = () => {
      if (oneSet <= 0) return;
      if (!drag.current?.moved && performance.now() >= interactUntil.current) return; // auto: leave it
      if (el.scrollLeft >= low + oneSet) el.scrollLeft -= oneSet;
      else if (el.scrollLeft < low) el.scrollLeft += oneSet;
    };
    // The next card whose centre is at/ahead of the current centre, so resuming always continues
    // forward (rightward) — never snaps back to a card we just scrolled past.
    const forward = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      for (let i = 0; i < el.children.length; i++) {
        const c = el.children[i] as HTMLElement;
        if (c.offsetLeft + c.offsetWidth / 2 >= mid - 4) return i;
      }
      return el.children.length - 1;
    };
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // easeInOutCubic

    let idx = idxRef.current; // active card — persisted across re-runs so position never resets
    let phase: "dwell" | "move" = "dwell";
    let elapsed = 0, from = 0, to = 0, raf = 0, lastT = 0, started = false, wasPaused = false, visible = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const ro = new ResizeObserver(() => { measure(); if (oneSet > 0 && started) el.scrollLeft = center(idx); });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "200px" });
    io.observe(el);
    el.addEventListener("scroll", wrap, { passive: true });

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = lastT ? Math.min(t - lastT, 50) : 16;
      lastT = t;
      if (oneSet <= 0) { measure(); }
      if (oneSet <= 0) return;
      if (!started) { el.scrollLeft = center(idx); started = true; return; } // idx persisted across re-runs
      // Pause while actively scrolling/dragging, or while a popup/modal is open (the rail is behind
      // it) — not on hover, and not on a click/tap.
      const modalOpen = !!document.querySelector('[aria-modal="true"]');
      if (!visible || reduce || modalOpen || drag.current?.moved || t < interactUntil.current) { wasPaused = true; return; }
      if (wasPaused) { // resume: smoothly glide forward to the next card (never backward)
        wasPaused = false;
        idx = forward();
        from = el.scrollLeft; to = center(idx); phase = "move"; elapsed = 0;
      }
      elapsed += dt;
      if (phase === "dwell") {
        if (elapsed >= DWELL) { phase = "move"; elapsed = 0; from = el.scrollLeft; idx += 1; to = center(idx); }
      } else {
        const p = Math.min(elapsed / MOVE, 1);
        el.scrollLeft = from + (to - from) * ease(p);
        if (p >= 1) { // settle, then re-anchor exactly to the middle copy (seamless, no rounding drift)
          phase = "dwell"; elapsed = 0;
          while (idx >= 2 * N) idx -= N;
          while (idx < N) idx += N;
          el.scrollLeft = center(idx);
        }
      }
      idxRef.current = idx; // persist so a re-render (e.g. opening a card popup) never resets position
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); el.removeEventListener("scroll", wrap); };
    // Keyed on item COUNT, not the array identity — the parent passes a fresh items array each
    // render, so depending on `items` would re-run this effect (resetting position) on every re-render.
  }, [items.length, aspects]);

  // Mouse drag-to-scroll. A plain click never counts as interaction (no bump) so it doesn't move
  // the carousel; only a real drag (moved past threshold) does. Delta-based so it survives the
  // scrollLeft wrapping (which re-anchors mid-drag for the infinite loop).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !scrollRef.current) return;
    drag.current = { startX: e.clientX, lastX: e.clientX, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !scrollRef.current) return;
    if (!drag.current.moved && Math.abs(e.clientX - drag.current.startX) > 4) {
      drag.current.moved = true; scrollRef.current.setPointerCapture?.(e.pointerId);
    }
    if (drag.current.moved) { bump(); scrollRef.current.scrollLeft += drag.current.lastX - e.clientX; }
    drag.current.lastX = e.clientX;
  };
  const endDrag = () => { if (drag.current?.moved) bump(); drag.current = null; };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current?.moved) { e.stopPropagation(); e.preventDefault(); }
  };
  // Touch: bump only on a real swipe (not a tap), so tapping a card doesn't move the carousel.
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0]?.clientX ?? 0; };
  const onTouchMove = (e: React.TouchEvent) => { if (Math.abs((e.touches[0]?.clientX ?? 0) - touchX.current) > 6) bump(); };

  const mask = `linear-gradient(to right, transparent 0, #000 ${FADE}px, #000 calc(100% - ${FADE}px), transparent 100%)`;
  const loop = [...items, ...items, ...items]; // 3 copies so the centred card always has neighbours

  return (
    <div
      ref={scrollRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={bump}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onClickCapture={onClickCapture}
      style={{ WebkitMaskImage: mask, maskImage: mask }}
      className="no-scrollbar relative flex cursor-grab gap-4 overflow-x-auto overscroll-x-contain px-1 py-2 active:cursor-grabbing"
    >
      {loop.map((item, i) => (
        <ArchiveCard key={i} item={item} aspect={aspects[i % items.length] ?? 16 / 9} onOpen={() => onOpen(item.popup)} />
      ))}
    </div>
  );
}

/* ── Mobile: swipeable stacked card deck ─────────────────────────────────────
   The original vertical card (video on top, text below) stacked like a deck.
   Swipe left/right switches the top card; it also auto-advances on a timer
   (paused while dragging, while a popup is open, off-screen, or reduced-motion). */
const DECK_DWELL = 3500; // ms between auto-advances
// The transform for a card at depth `o`: 0 = front, 1/2 = fanned behind, -1 = the visible card at
// the BOTTOM of the pile, otherwise tucked fully behind (hidden, used for entering/leaving).
// Advancing just changes each card's depth, so swiping forward sends the top card down to the
// visible bottom, and swiping back lifts the bottom card up to the front.
function deckSlot(o: number) {
  if (o === 0) return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, zIndex: 30 };
  if (o === 1) return { x: -12, y: 8, rotate: -4, scale: 0.965, opacity: 1, zIndex: 20 };
  if (o === 2) return { x: 13, y: 16, rotate: 5, scale: 0.93, opacity: 1, zIndex: 10 };
  if (o === -1) return { x: 0, y: 24, rotate: -2, scale: 0.9, opacity: 1, zIndex: 6 }; // bottom of the pile
  return { x: 0, y: 30, rotate: 0, scale: 0.82, opacity: 0, zIndex: 3 }; // hidden (entering / leaving)
}

const hash = (s: number) => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
// Slot transform plus a per-position random "mess" (seeded by the card's absolute position, so the
// fan reshuffles on every swipe / auto-advance). The front card stays clean and centred.
function deckTarget(o: number, seed: number) {
  const s = deckSlot(o);
  if (o === 0) return s;
  return { ...s, x: s.x + (hash(seed) - 0.5) * 20, y: s.y + (hash(seed + 7.3) - 0.5) * 12, rotate: s.rotate + (hash(seed + 13.1) - 0.5) * 9 };
}

function DeckCard({ item }: { item: ArchiveItem }) {
  const { popup, index } = item;
  const dark = useDarkMode();
  const id = ytId(popup);
  const hasMedia = !!(popup.videoUrl || id);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[rgb(var(--c-line-rgb)/0.12)] bg-surface shadow-[0_12px_34px_rgba(28,21,8,0.16)]">
      {hasMedia && (
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black/5">
          {popup.videoUrl ? (
            <LazyVideo src={popup.videoUrl} poster={videoPoster(popup.videoUrl)} className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(https://img.youtube.com/vi/${id}/hqdefault.jpg)` }} />
              <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-walnut shadow-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </span>
            </>
          )}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <span className="font-mono text-[11px] tracking-[0.22em] text-pine">No. {index}</span>
        <h3 className="mt-1.5 line-clamp-2 font-display text-[18px] font-semibold leading-snug text-pine">{popup.title}</h3>
        {popup.description && (
          <p className={`mt-2 flex-1 font-sans text-[13px] leading-relaxed text-walnut/80 dark:leading-[1.6] ${hasMedia ? "line-clamp-3" : "line-clamp-6"}`}>{popup.description}</p>
        )}
        {popup.tech && popup.tech.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {popup.tech.slice(0, 4).map((t) => {
              const c = skillColorFor(t);
              return (
                <span key={t} className="rounded border px-2 py-0.5 font-mono text-[10px]" style={{ borderColor: c.border, background: c.bg, color: dark ? c.solidDark : c.solid }}>{t}</span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Cards rendered around the front (depth offsets). -1 lingers one step so the card that just went
// to the back can finish animating there before unmounting.
const DECK_WINDOW = [-2, -1, 0, 1, 2];

function Deck({ items, onOpen }: ArchiveScrollerProps) {
  const n = items.length;
  const [index, setIndex] = useState(0);
  const interacting = useRef(false);
  const dragged = useRef(false); // true through a drag, so a swipe doesn't fire onTap (open)
  const visibleRef = useRef(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const at = (o: number) => items[(((index + o) % n) + n) % n];

  // Auto-advance — restarted on every advance, so a manual swipe resets the timer.
  const restart = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = setInterval(() => {
      const modal = !!document.querySelector('[aria-modal="true"]');
      if (visibleRef.current && !modal && !interacting.current) setIndex((i) => i + 1);
    }, DECK_DWELL);
  }, []);
  const advance = (d: number) => { setIndex((i) => i + d); restart(); };

  useEffect(() => {
    if (n === 0) return;
    const io = new IntersectionObserver(([e]) => { visibleRef.current = e.isIntersecting; }, { rootMargin: "120px" });
    if (wrapRef.current) io.observe(wrapRef.current);
    restart();
    return () => { if (timer.current) clearInterval(timer.current); io.disconnect(); };
  }, [n, restart]);

  if (n === 0) return null;

  return (
    <div ref={wrapRef} className="relative mx-auto h-[440px] w-full max-w-[330px] touch-pan-y select-none">
      {DECK_WINDOW.map((o) => {
        const front = o === 0;
        return (
          <motion.div
            key={(((index + o) % n) + n) % n} // keyed by item, so depth changes animate the same card
            className={`absolute inset-0 ${front ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
            initial={deckSlot(o >= 0 ? o + 1 : o - 1)} // mount from the adjacent hidden slot
            animate={deckTarget(o, index + o)}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
            {...(front
              ? {
                  drag: "x" as const,
                  dragConstraints: { left: 0, right: 0 },
                  dragElastic: 0.6,
                  onDragStart: () => { interacting.current = true; dragged.current = true; },
                  onDragEnd: (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
                    interacting.current = false;
                    if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 450) advance(info.offset.x < 0 ? 1 : -1);
                    setTimeout(() => { dragged.current = false; }, 0);
                  },
                  onTap: () => { if (!dragged.current) onOpen(at(0).popup); },
                }
              : {})}
          >
            <DeckCard item={at(o)} />
          </motion.div>
        );
      })}
    </div>
  );
}

export default function ArchiveScroller(props: ArchiveScrollerProps) {
  return useIsMobile() ? <Deck {...props} /> : <Rail {...props} />;
}
