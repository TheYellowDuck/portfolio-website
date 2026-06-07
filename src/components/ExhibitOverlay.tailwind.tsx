"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExhibitPopup } from "@/data/projects";
import ResumePopup from "./ResumePopup.tailwind";
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
}

export default function ExhibitOverlay({ popup, onClose }: ExhibitOverlayProps) {
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
            style={{ width: `min(${popup.width ?? "500px"}, 92vw)` }}
          >
              <motion.div
                key="popup"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                className="w-full flex flex-col overflow-y-auto rounded-lg border-2 border-sage bg-parchment shadow-[0_8px_40px_rgba(28,21,8,0.35)] [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]"
                style={{ maxHeight: (popup.embedUrl || popup.videoUrl) ? "95vh" : "min(460px, 72vh)" }}
              >
                {/* Header — fixed, never scrolls */}
                <div className="shrink-0 flex justify-between items-start gap-4 px-5 py-3 bg-parchment border-b border-[rgba(58,46,30,0.15)]">
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
                    className="shrink-0 select-none bg-transparent border border-[rgba(58,46,30,0.25)] rounded text-walnut font-mono text-[13px] px-3 py-1 cursor-pointer transition-colors hover:bg-[rgba(58,46,30,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
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
                      <div className="shrink-0 overflow-y-auto border-t border-[rgba(58,46,30,0.1)] px-5 py-3 [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]" style={{ maxHeight: "7rem" }}>
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
                      <div className="shrink-0 flex flex-wrap gap-2.5 px-5 py-3 border-t border-[rgba(58,46,30,0.1)]">
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
                  /* ── TEXT layout: description fills space, links at bottom ── */
                  <div className="flex-1 min-h-0 flex flex-col bg-parchment overflow-hidden">
                    {(popup.description || popup.tech?.length || popup.skills?.length) && (
                      <div className="flex-1 min-h-0 flex overflow-hidden">
                        {popup.description && (
                          <p className="flex-1 min-h-0 overflow-y-auto m-0 font-mono text-[14px] text-walnut leading-[1.7] px-5 py-4 [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]">
                            {popup.description}
                          </p>
                        )}
                        {(popup.tech?.length || popup.skills?.length) ? (
                          <div className="shrink-0 w-40 flex flex-col gap-1.5 px-4 py-4 border-l border-[rgba(58,46,30,0.1)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]">
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
                      <div className="shrink-0 flex flex-wrap gap-2.5 px-5 py-3 border-t border-[rgba(58,46,30,0.1)]">
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
