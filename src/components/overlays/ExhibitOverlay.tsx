"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExhibitPopup } from "@/data/projects";
import ResumePopup from "./ResumePopup";
import TranscriptPopup from "./TranscriptPopup";

const SKILL_GROUP_COLORS = [
  { bg: "rgba(122,158,126,0.12)", border: "rgba(122,158,126,0.45)" }, // sage green
  { bg: "rgba(107,138,174,0.12)", border: "rgba(107,138,174,0.45)" }, // dusty blue
  { bg: "rgba(185,130,90,0.12)",  border: "rgba(185,130,90,0.45)"  }, // terracotta
  { bg: "rgba(172,148,89,0.12)",  border: "rgba(172,148,89,0.45)"  }, // amber
  { bg: "rgba(148,115,160,0.12)", border: "rgba(148,115,160,0.45)" }, // mauve
];

interface ExhibitOverlayProps {
  popup: ExhibitPopup | null;
  onClose: () => void;
  /** Ease in slowly (used for the curator reward, which should bloom rather than snap). */
  gentle?: boolean;
}

export default function ExhibitOverlay({ popup, onClose, gentle = false }: ExhibitOverlayProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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
    const raf = requestAnimationFrame(() => modalRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) { e.preventDefault(); modalRef.current?.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      restoreTo?.focus?.();
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

          {/* Centered popup — max-height on motion div constrains flex; body scrolls inside */}
          <div className="fixed top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
            style={{ width: `min(${popup.width ?? "500px"}, 92vw)` }}
          >
              <motion.div
                key="popup"
                ref={modalRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={popup.title ?? "Exhibit"}
                initial={{ opacity: 0, scale: gentle ? 0.94 : 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={gentle ? { duration: 0.9, ease: [0.16, 1, 0.3, 1] } : { type: "spring", damping: 30, stiffness: 400 }}
                className="w-full flex flex-col overflow-y-auto rounded-lg border-2 border-sage bg-parchment shadow-[0_8px_40px_rgba(28,21,8,0.35)] outline-none [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]"
                style={{ maxHeight: (popup.embedUrl || popup.videoUrl) ? "95vh" : "min(460px, 72vh)" }}
              >
                {/* Header — fixed, never scrolls */}
                <div className="shrink-0 flex justify-between items-start gap-4 px-5 py-3 bg-parchment border-b border-[rgb(var(--c-line-rgb)_/_0.15)]">
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
                  <button
                    onClick={onClose}
                    autoFocus
                    aria-label="Close"
                    className="shrink-0 select-none bg-transparent border border-[rgb(var(--c-line-rgb)_/_0.25)] rounded text-walnut font-mono text-[13px] px-3 py-1 cursor-pointer transition-colors hover:bg-[rgb(var(--c-line-rgb)_/_0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                  >
                    close [`]
                  </button>
                </div>

                {(popup.videoUrl || popup.embedUrl) ? (
                  /* ── MEDIA layout: video or iframe → description → links ── */
                  <div className="flex flex-col">
                    {popup.videoUrl ? (
                      <video
                        src={popup.videoUrl}
                        className="shrink-0 w-full aspect-video bg-black"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <iframe
                        src={popup.embedUrl}
                        className="shrink-0 w-full aspect-video border-0 bg-black"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                      />
                    )}

                    {(popup.description || popup.tech?.length) && (
                      <div className="shrink-0 overflow-y-auto border-t border-[rgb(var(--c-line-rgb)_/_0.1)] px-5 py-3 [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]" style={{ maxHeight: "7rem" }}>
                        {popup.tech?.length ? (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {popup.tech.map((t) => (
                              <span key={t} className="font-mono text-[11px] text-pine bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.5)] rounded px-2 py-0.5">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {popup.description && (
                          <p className="m-0 font-mono text-[13px] text-walnut leading-[1.7]">
                            {popup.description}
                          </p>
                        )}
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
                ) : (
                  /* ── TEXT layout: single scrolling body so the description is always
                       readable (no nested panes that can squeeze it) ── */
                  <div className="flex-1 min-h-0 overflow-y-auto bg-parchment [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]">
                    {(popup.description || popup.tech?.length || popup.skills?.length) && (
                      <div className="flex flex-col sm:flex-row">
                        {popup.description && (
                          <p className="flex-1 m-0 font-mono text-[14px] text-walnut leading-[1.7] px-5 py-4">
                            {popup.description}
                          </p>
                        )}
                        {(popup.tech?.length || popup.skills?.length) ? (
                          <div className={`shrink-0 flex flex-row flex-wrap gap-1.5 ${
                            popup.description
                              ? "w-full sm:w-40 sm:flex-col px-5 sm:px-4 py-4 border-t sm:border-t-0 sm:border-l border-[rgb(var(--c-line-rgb)_/_0.1)]"
                              : "w-full px-5 py-4"
                          }`}>
                            {popup.tech?.map((t) => (
                              <span key={t} className="font-mono text-[11px] text-pine bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.5)] rounded px-2 py-0.5">
                                {t}
                              </span>
                            ))}
                            {popup.skills?.flatMap((group, i) => {
                              const color = SKILL_GROUP_COLORS[i % SKILL_GROUP_COLORS.length];
                              return group.items.map((item) => (
                                <span key={item} className="font-mono text-[11px] text-walnut rounded px-2 py-0.5 border" style={{ background: color.bg, borderColor: color.border }}>
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
                )}
              </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
