"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExhibitPopup } from "@/data/projects";
import { COLORS } from "@/styles/theme";

interface ExhibitOverlayProps {
  popup: ExhibitPopup | null;
  onClose: () => void;
}

export default function ExhibitOverlay({ popup, onClose }: ExhibitOverlayProps) {
  return (
    <AnimatePresence>
      {popup && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: COLORS.BACKDROP,
              zIndex: 20,
            }}
          />

          {/* Centered popup */}
          <motion.div
            key="popup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: `min(${popup.width || "500px"}, 90vw)`,
              maxHeight: popup.embedUrl
                ? `min(${popup.height || "650px"}, 90vh)`
                : "80vh",
              background: COLORS.PARCHMENT,
              border: `2px solid ${COLORS.SAGE}`,
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              zIndex: 30,
              boxShadow: `0 8px 40px ${COLORS.POPUP_SHADOW}`,
            }}
          >
            {/* Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: popup.description || popup.embedUrl
                ? `1px solid ${COLORS.DIVIDER}`
                : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexShrink: 0,
              background: COLORS.PARCHMENT,
            }}>
              <div style={{ flex: 1 }}>
                {popup.title && (
                  <h2 style={{
                    color: COLORS.TEXT_SAGE,
                    fontFamily: "monospace",
                    fontSize: 22,
                    margin: 0,
                  }}>
                    {popup.title}
                  </h2>
                )}
                {popup.tech && popup.tech.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {popup.tech.map((t) => (
                      <span key={t} style={{
                        background: COLORS.TAG_BG,
                        border: `1px solid ${COLORS.TAG_BORDER}`,
                        borderRadius: 4,
                        padding: "2px 10px",
                        color: COLORS.TEXT_SAGE,
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={onClose} style={{
                background: "none",
                border: `1px solid ${COLORS.BTN_BORDER}`,
                borderRadius: 4,
                color: COLORS.TEXT_DARK,
                padding: "4px 12px",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 13,
                flexShrink: 0,
              }}>
                ESC
              </button>
            </div>

            {/* Body */}
            <div style={{
              flex: popup.embedUrl ? 1 : undefined,
              display: "flex",
              flexDirection: "column",
              overflow: popup.embedUrl ? "hidden" : "auto",
              background: COLORS.PARCHMENT,
            }}>
              {popup.description && (
                <p style={{
                  color: COLORS.TEXT_DARK,
                  fontFamily: "monospace",
                  fontSize: 14,
                  lineHeight: 1.7,
                  margin: 0,
                  padding: "16px 20px",
                  flexShrink: 0,
                }}>
                  {popup.description}
                </p>
              )}

              {popup.embedUrl && (
                <iframe
                  src={popup.embedUrl}
                  style={{ flex: 1, border: "none", background: "#000", minHeight: 300 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                />
              )}

              {popup.links && popup.links.length > 0 && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  padding: "16px 20px",
                  flexShrink: 0,
                }}>
                  {popup.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        background: COLORS.LINK_BG,
                        border: `1px solid ${COLORS.LINK_BORDER}`,
                        borderRadius: 4,
                        padding: "8px 16px",
                        color: COLORS.TEXT_DARK,
                        fontFamily: "monospace",
                        fontSize: 13,
                        textDecoration: "none",
                      }}
                    >
                      {link.label} →
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
