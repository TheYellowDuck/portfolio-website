// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExhibitPopup } from "@/data/projects";
import ResumePopup from "./ResumePopup";
import TranscriptPopup from "./TranscriptPopup";
import { categoryColor } from "@/lib/skill-colors";
import { useTilt } from "@/lib/use-tilt";
import { videoPoster } from "@/lib/video";
import CpStats from "@/components/CpStats";
import HandwrittenNote from "@/components/site/HandwrittenNote";
import { PressButton } from "@/components/PressButton";

// YouTube embeds don't autoplay/loop without params — add them so the popup video
// plays muted on a loop (like the card preview); viewers can unmute via the controls.
// Use youtube-nocookie.com to reduce fingerprinting (helps VPN users avoid the bot check).
function embedSrc(url: string) {
  const m = url.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/);
  if (!m) return url;
  const base = url.replace("youtube.com/embed/", "youtube-nocookie.com/embed/");
  return `${base}${base.includes("?") ? "&" : "?"}autoplay=1&mute=1&loop=1&playlist=${m[1]}&rel=0&modestbranding=1`;
}

function youtubeVideoId(url: string): string | null {
  return url.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/)?.[1] ?? null;
}

function youtubeWatchUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

// Probes YouTube reachability by loading a thumbnail — fails fast if GFW blocks it.
// Shows the iframe when reachable; shows a text fallback + watch link when blocked.
function YoutubeEmbed({ embedUrl }: { embedUrl: string }) {
  const videoId = youtubeVideoId(embedUrl);
  const watchUrl = youtubeWatchUrl(embedUrl);
  // Derived initial state (no parseable id → unavailable) so the effect never setStates synchronously;
  // the key={embedUrl} on the usage remounts this on a video change, re-running the initializer.
  const [reachable, setReachable] = useState<boolean | null>(videoId ? null : false);

  useEffect(() => {
    if (!videoId) return;
    const img = new Image();
    const timer = setTimeout(() => setReachable(false), 4000);
    img.onload = () => { clearTimeout(timer); setReachable(true); };
    img.onerror = () => { clearTimeout(timer); setReachable(false); };
    img.src = `https://img.youtube.com/vi/${videoId}/default.jpg?_=${Date.now()}`;
    return () => { clearTimeout(timer); img.onload = null; img.onerror = null; };
  }, [videoId]);

  return (
    <>
      <div className="relative shrink-0 w-full aspect-video">
        {reachable !== true && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/5">
            {reachable === false && (
              <>
                <span className="font-mono text-[12px] text-walnut/40">Video unavailable in your region</span>
                {watchUrl && (
                  <a href={watchUrl} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-[12px] text-sage hover:text-walnut transition-colors">
                    Watch on YouTube ↗
                  </a>
                )}
              </>
            )}
          </div>
        )}
        {reachable === true && (
          <iframe src={embedSrc(embedUrl)} className="absolute inset-0 w-full h-full border-0 bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope" />
        )}
      </div>
      {reachable === true && watchUrl && (
        <a href={watchUrl} target="_blank" rel="noopener noreferrer"
          className="self-end px-5 pt-1 pb-0 font-mono text-[11px] text-walnut/50 hover:text-walnut transition-colors">
          Watch on YouTube ↗
        </a>
      )}
    </>
  );
}

// Popup width, in priority order:
//   1. explicit `width` — honored as-is (escape hatch).
//   2. experience popups (identified by a role subtitle + date) — always render wider, a
//      deliberate setting so every experience matches regardless of how much it lists.
//   3. media popups — take the max, for the video.
//   4. everything else — scales with how much is inside (skill/tech chips + description), up to MAX_W.
// Always wrapped in `min(…, 92vw)` so it stays fluid on small screens and live-reflows on resize;
// height (vh maxHeight) and the body's internal scroll are handled separately below.
const MIN_W = 500;
const MAX_W = 760;          // cap for the auto content-scaling
const EXPERIENCE_W = 800;   // experience popups always render wider than projects
function popupWidth(p: ExhibitPopup): string {
  if (p.width) return `min(${p.width}, 92vw)`;
  if (p.subtitle && p.date) return `min(${EXPERIENCE_W}px, 92vw)`;
  if (p.videoUrl || p.embedUrl) return `min(${MAX_W}px, 92vw)`;
  const chips = p.skills?.length ? p.skills.reduce((n, g) => n + g.items.length, 0) : (p.tech?.length ?? 0);
  const desc = Math.min(p.description?.length ?? 0, 600);
  const w = Math.min(MAX_W, Math.round(MIN_W + chips * 5 + desc * 0.12));
  return `min(${w}px, 92vw)`;
}

interface ExhibitOverlayProps {
  popup: ExhibitPopup | null;
  onClose: () => void;
  /** Ease in slowly (used for the curator reward, which should bloom rather than snap). */
  gentle?: boolean;
}

export default function ExhibitOverlay({ popup, onClose, gentle = false }: ExhibitOverlayProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  // Barely-there 3D lean on the popup card (it's a large reading surface, so keep it whisper-subtle).
  const popupTilt = useTilt<HTMLDivElement>({ max: 2, glint: false });
  const skillRefs = useRef<(HTMLDivElement | null)[]>([]); // skill-group anchors for the left tab rail

  // Lock background page scroll while a popup is open, so the page behind never scrolls (e.g. when the
  // pointer is over the popup's skills section). The viewport scrolls via the root <html> element, so
  // `overflow: hidden` has to go on documentElement — setting it on <body> alone does nothing. Pad for
  // the now-missing scrollbar so the page behind doesn't shift (a no-op with macOS overlay scrollbars).
  useEffect(() => {
    if (!popup) return;
    const docEl = document.documentElement;
    const scrollbar = window.innerWidth - docEl.clientWidth;
    const prev = { html: docEl.style.overflow, body: document.body.style.overflow, pad: document.body.style.paddingRight };
    docEl.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      docEl.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
      document.body.style.paddingRight = prev.pad;
    };
  }, [popup]);

  // While a popup is open: Esc closes it, focus moves into the dialog and is trapped
  // there (Tab wraps), and focus returns to the trigger on close.
  useEffect(() => {
    if (!popup) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    const focusables = () =>
      modalRef.current
        ? Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];
    // preventScroll: focusing a taller-than-viewport card would otherwise scroll the overlay and
    // push the header off the top. We want it to open at the top, header visible.
    const raf = requestAnimationFrame(() => modalRef.current?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) { e.preventDefault(); modalRef.current?.focus({ preventScroll: true }); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      // preventScroll so returning focus to the trigger doesn't scroll it into view — that would jump
      // the page away from where it was when the popup opened (e.g. an archive card with "Show all" on).
      restoreTo?.focus?.({ preventScroll: true });
    };
  }, [popup, onClose]);

  return (
    <AnimatePresence>
      {popup && popup.type === "resume" && (
        <ResumePopup key="resume" onClose={onClose} />
      )}

      {popup && popup.type === "transcript" && (
        <TranscriptPopup key="transcript" onClose={onClose} />
      )}

      {popup && popup.type !== "resume" && popup.type !== "transcript" && (
        <>
          {/* Backdrop — click to close */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: gentle ? 0.8 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-20 bg-[rgba(28,21,8,0.72)] backdrop-blur-sm"
          />

          {/* Scroll container — centers the popup; on a small/short screen (narrower or shorter
              than "roomy") the WHOLE popup, header included, scrolls as one unit. On a roomy screen
              the card caps its height and the two columns scroll on their own. Click the gap to close. */}
          <div className="fixed inset-0 z-30 overflow-y-auto overscroll-contain" onClick={onClose}>
            {/* my-auto on the card (not items-center) so it centers when it fits but top-aligns when
                taller than the viewport — keeping the header reachable instead of clipped above. */}
            <div className="flex min-h-full justify-center p-2 sm:p-4">
              <motion.div
                // Key on the popup identity so swapping one popup straight to another (e.g. the
                // queued curator's note after closing an exhibit) remounts the card and plays its
                // enter animation, instead of a flat in-place content swap. The backdrop key is
                // constant, so the dim persists across the swap (no flash).
                key={popup.title ?? "exhibit"}
                ref={(el: HTMLDivElement | null) => { modalRef.current = el; popupTilt(el); }}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={popup.title ?? "Exhibit"}
                initial={{ opacity: 0, scale: gentle ? 0.94 : 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={gentle ? { duration: 0.9, ease: [0.16, 1, 0.3, 1] } : { type: "spring", damping: 30, stiffness: 400 }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: popupWidth(popup) }}
                className={`my-auto flex flex-col rounded-lg border-2 border-sage bg-parchment shadow-[0_8px_40px_rgba(28,21,8,0.35)] outline-none [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent] roomy:overflow-hidden ${(popup.embedUrl || popup.videoUrl) ? "roomy:max-h-[min(560px,82vh)]" : "roomy:max-h-[min(460px,72vh)]"}`}
              >
                {/* Header — sticky only on roomy screens (columns scroll under it); on small/short
                    screens it scrolls with the unit, so the title is part of the scroll. */}
                <div className="roomy:sticky roomy:top-0 z-10 shrink-0 flex justify-between items-start gap-4 px-5 py-3 bg-parchment border-b border-[rgb(var(--c-line-rgb)_/_0.15)]">
                  <div className="flex-1">
                    {popup.title && (
                      <h2 className="m-0 font-mono text-[22px] text-pine">
                        {popup.title}
                      </h2>
                    )}
                    {popup.subtitle && (
                      <p className="m-0 mt-0.5 font-mono text-[14px] text-walnut opacity-70">
                        {popup.subtitle}
                      </p>
                    )}
                    {popup.date && (
                      <p className="m-0 mt-0.5 font-mono text-[12px] text-sage">
                        {popup.date}
                      </p>
                    )}
                  </div>
                  <PressButton
                    onClick={onClose}
                    aria-label="Close"
                    className="shrink-0 select-none bg-transparent border border-[rgb(var(--c-line-rgb)_/_0.25)] rounded text-walnut font-mono text-[13px] px-3 py-1 cursor-pointer transition-colors hover:bg-[rgb(var(--c-line-rgb)_/_0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                  >
                    close [`]
                  </PressButton>
                </div>

                {/* Body — on desktop the left column (video over description) scrolls on its
                    own and the skills side column scrolls separately; on mobile it all scrolls
                    together in the dialog. Links stay pinned at the bottom. */}
                <div className="flex flex-col roomy:flex-1 roomy:min-h-0">
                  {(popup.description || popup.tech?.length || popup.skills?.length || popup.videoUrl || popup.embedUrl) && (
                    <div className="flex flex-col roomy:flex-row roomy:flex-1 roomy:min-h-0 roomy:overflow-hidden">
                      {/* Left — video above description; scrolls on its own only when roomy */}
                      <div className="flex-1 min-w-0 flex flex-col roomy:overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]">
                        {popup.videoUrl ? (
                          <video src={popup.videoUrl} poster={videoPoster(popup.videoUrl)} className="shrink-0 w-full aspect-video bg-black" autoPlay loop muted playsInline controls />
                        ) : popup.embedUrl ? (
                          <YoutubeEmbed key={popup.embedUrl} embedUrl={popup.embedUrl} />
                        ) : null}
                        {/* Live LeetCode + DMOJ stats for the Competitive Programming / The Grind exhibits. */}
                        {/competitive programming|the grind/i.test(popup.title ?? "") && (
                          <div className="px-5 pt-4">
                            <CpStats />
                          </div>
                        )}
                        {popup.description && (
                          popup.handwritten ? (
                            <HandwrittenNote text={popup.description} className="cursor-default px-5 py-4 font-hand text-[25px] leading-[1.5] text-walnut" />
                          ) : (
                            <p className="m-0 font-mono text-[14px] text-walnut leading-[1.7] px-5 py-4">
                              {popup.description}
                            </p>
                          )
                        )}
                        {/* The "Skills" exhibit shows its grouped skills as the main content
                            (full width, by category) rather than in the narrow side column. */}
                        {popup.title === "Skills" && popup.skills && (
                          <div className="flex gap-3 px-5 pb-4 roomy:flex-1 roomy:min-h-0 roomy:overflow-hidden">
                            {/* Left tab rail — its OWN scroll, independent of the groups column. */}
                            <nav aria-label="Skill groups" className="shrink-0 w-28 sm:w-36 flex flex-col gap-0.5 roomy:overflow-y-auto roomy:min-h-0 overscroll-contain [scrollbar-width:none]">
                              {popup.skills.map((group, i) => {
                                const c = categoryColor(group.category);
                                return (
                                  <PressButton
                                    key={group.category}
                                    onClick={() => skillRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                                    className="text-left font-mono text-[11px] rounded px-2 py-1 hover:bg-[rgb(var(--c-line-rgb)_/_0.08)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                                    style={{ color: c.solid }}
                                  >
                                    {group.category}
                                  </PressButton>
                                );
                              })}
                            </nav>
                            {/* Groups — separate independent scroll. */}
                            <div className="flex-1 min-w-0 flex flex-col gap-4 roomy:overflow-y-auto roomy:min-h-0 overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]">
                              {popup.skills.map((group, i) => {
                                const c = categoryColor(group.category);
                                return (
                                  <div key={group.category} ref={(el) => { skillRefs.current[i] = el; }} style={{ scrollMarginTop: 8 }}>
                                    <h3 className="m-0 mb-2 font-mono text-[12px] uppercase tracking-[0.18em]" style={{ color: c.solid }}>
                                      {group.category}
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                      {group.items.map((item) => (
                                        <span key={item} className="font-mono text-[11px] rounded border px-2 py-0.5" style={{ background: c.bg, borderColor: c.border, color: c.solid }}>
                                          {item}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Right — skills column: a horizontal tag row when stacked, a separately-
                          scrolling side column only when roomy. The "Skills" exhibit renders its
                          skills as main content above, so it has no side column. */}
                      {popup.title !== "Skills" && (popup.tech?.length || popup.skills?.length) ? (
                        <div className="shrink-0 w-full roomy:w-48 flex flex-row roomy:flex-col flex-wrap roomy:flex-nowrap gap-1.5 px-5 roomy:px-4 py-4 border-t roomy:border-t-0 roomy:border-l border-[rgb(var(--c-line-rgb)_/_0.1)] roomy:overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]">
                          {!popup.skills?.length && popup.tech?.map((t) => (
                            <span key={t} className="font-mono text-[11px] text-pine bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.5)] rounded px-2 py-0.5">
                              {t}
                            </span>
                          ))}
                          {popup.skills?.flatMap((group) => {
                            const c = categoryColor(group.category);
                            return group.items.map((item) => (
                              <span key={item} className="font-mono text-[11px] rounded px-2 py-0.5 border" style={{ background: c.bg, borderColor: c.border, color: c.solid }}>
                                {item}
                              </span>
                            ));
                          })}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {popup.links && popup.links.length > 0 && (
                    <div className="shrink-0 flex flex-wrap gap-2.5 px-5 py-3 border-t border-[rgb(var(--c-line-rgb)_/_0.1)]">
                      {popup.links.map((link) => (
                        <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="inline-block font-mono text-[13px] text-walnut no-underline bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.55)] rounded px-4 py-2 transition-colors hover:bg-[rgba(122,158,126,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50">
                          {link.label} →
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
