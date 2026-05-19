"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExhibitPopup } from "@/data/projects";
import ResumePopup from "./ResumePopup.tailwind";

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
            className="fixed inset-0 z-20 bg-[rgba(28,21,8,0.72)] backdrop-blur-sm"
          />

          {/* Centered popup — max-height on motion div constrains flex; body scrolls inside */}
          <div className="fixed top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
            style={{ width: `min(${popup.width ?? "500px"}, 90vw)` }}
          >
              <motion.div
                key="popup"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full flex flex-col overflow-y-auto rounded-lg border-2 border-sage bg-parchment shadow-[0_8px_40px_rgba(28,21,8,0.35)] [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]"
                style={{ maxHeight: "90vh" }}
              >
                {/* Header */}
                <div
                  className={`shrink-0 flex justify-between items-start gap-4 px-5 py-4 bg-parchment${
                    popup.description || popup.embedUrl
                      ? " border-b border-[rgba(58,46,30,0.15)]"
                      : ""
                  }`}
                >
                  <div className="flex-1">
                    {popup.title && (
                      <h2 className="m-0 font-mono text-[22px] text-pine">
                        {popup.title}
                      </h2>
                    )}
                    {popup.tech && popup.tech.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {popup.tech.map((t) => (
                          <span
                            key={t}
                            className="font-mono text-[12px] text-pine bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.5)] rounded px-2.5 py-0.5"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="shrink-0 select-none bg-transparent border border-[rgba(58,46,30,0.25)] rounded text-walnut font-mono text-[13px] px-3 py-1 cursor-pointer transition-colors hover:bg-[rgba(58,46,30,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                  >
                    close [`]
                  </button>
                </div>

                {/* Body */}
                <div className="flex flex-col bg-parchment">
                  {(popup.description || (popup.skills && popup.skills.length > 0)) && (
                    <div className="flex">
                      {popup.description && (
                        <p className="flex-1 m-0 font-mono text-[14px] text-walnut leading-[1.7] px-5 py-4">
                          {popup.description}
                        </p>
                      )}
                      {popup.skills && popup.skills.length > 0 && (
                        <div
                          className={`shrink-0 w-40 py-4 pr-5 pl-5${
                            popup.description ? " border-l border-[rgba(58,46,30,0.1)]" : ""
                          }`}
                        >
                          <p className="m-0 mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-sage">
                            Skills Used
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {popup.skills.map((s) => (
                              <span
                                key={s}
                                className="font-mono text-[12px] text-walnut bg-[rgba(122,158,126,0.1)] border border-[rgba(122,158,126,0.38)] rounded px-2 py-0.5"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {popup.embedUrl && (
                    <iframe
                      src={popup.embedUrl}
                      className="border-0 bg-black"
                      style={{ height: `min(${popup.height ?? "650px"}, 70vh)` }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    />
                  )}

                  {popup.links && popup.links.length > 0 && (
                    <div className="shrink-0 flex flex-wrap gap-2.5 px-5 py-4">
                      {popup.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block font-mono text-[13px] text-walnut no-underline bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.55)] rounded px-4 py-2 transition-colors hover:bg-[rgba(122,158,126,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                        >
                          {link.label} →
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
