"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExhibitPopup } from "@/data/projects";
import ResumePopup from "./ResumePopup";

interface ExhibitOverlayProps {
  popup: ExhibitPopup | null;
  onClose: () => void;
}

export default function ExhibitOverlay({ popup, onClose }: ExhibitOverlayProps) {
  return (
    <AnimatePresence>
      {popup && popup.type === "resume" && (
        <ResumePopup key="resume" onClose={onClose} />
      )}

      {popup && popup.type !== "resume" && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-20 bg-black/55 backdrop-blur-sm"
          />

          {/* Card */}
          <div
            className="fixed top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
            style={{ width: `min(${popup.width ?? "500px"}, 92vw)` }}
          >
            <motion.div
              key="popup"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1,   y: 0  }}
              exit={{    opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="flex flex-col overflow-hidden rounded-xl border border-white/8 bg-panel shadow-[0_32px_80px_rgba(0,0,0,0.72)]"
              style={{
                maxHeight: popup.embedUrl
                  ? `min(${popup.height ?? "650px"}, 90vh)`
                  : "80vh",
              }}
            >
              {/* Header */}
              <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-5">
                <div className="min-w-0 flex-1">
                  {popup.title && (
                    <h2 className="font-mono text-[15px] font-semibold leading-snug text-ink-1 m-0">
                      {popup.title}
                    </h2>
                  )}
                  {popup.tech && popup.tech.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {popup.tech.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[11px] text-sage bg-[rgba(122,158,126,0.10)] border border-[rgba(122,158,126,0.28)] rounded-[5px] px-2.5 py-0.5"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="mt-0.5 shrink-0 rounded-md p-1.5 text-ink-4 border-none cursor-pointer bg-transparent transition-colors hover:bg-white/6 hover:text-ink-2"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Body */}
              {(popup.description || popup.embedUrl || popup.links?.length) ? (
                <div
                  className={`flex flex-col border-t border-white/6 ${
                    popup.embedUrl ? "flex-1 overflow-hidden" : "overflow-y-auto"
                  }`}
                >
                  {popup.description && (
                    <p className="shrink-0 px-6 py-5 font-mono text-[13px] leading-relaxed text-ink-2 m-0">
                      {popup.description}
                    </p>
                  )}

                  {popup.embedUrl && (
                    <iframe
                      src={popup.embedUrl}
                      className="min-h-[300px] flex-1 border-0 bg-black"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    />
                  )}

                  {popup.links && popup.links.length > 0 && (
                    <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/6 px-6 py-4">
                      {popup.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(122,158,126,0.35)] bg-[rgba(122,158,126,0.10)] px-4 py-2 font-mono text-[13px] text-sage no-underline transition-colors hover:bg-[rgba(122,158,126,0.18)] hover:text-ink-1"
                        >
                          {link.label}
                          <span className="opacity-50 text-[11px]">↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Footer */}
              <div className="shrink-0 border-t border-white/6 px-6 py-2.5">
                <span className="select-none font-mono text-[11px] text-ink-4">` to close</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
