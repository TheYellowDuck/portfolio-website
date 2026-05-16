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
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(28,21,8,0.72)",
              zIndex: 20,
            }}
          />

          {/* Centered popup */}
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 30,
            width: `min(${popup.width || "500px"}, 90vw)`,
            maxHeight: popup.embedUrl
              ? `min(${popup.height || "650px"}, 90vh)`
              : "80vh",
          }}>
          <motion.div
            key="popup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
              width: "100%",
              maxHeight: "inherit",
              background: "#fef9ec",
              border: `2px solid ${"#7a9e7e"}`,
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: `0 8px 40px ${"rgba(28,21,8,0.35)"}`,
            }}
          >
            {/* Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: popup.description || popup.embedUrl
                ? `1px solid ${"rgba(58,46,30,0.15)"}`
                : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexShrink: 0,
              background: "#fef9ec",
            }}>
              <div style={{ flex: 1 }}>
                {popup.title && (
                  <h2 style={{
                    color: "#4a7a44",
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
                        background: "rgba(122,158,126,0.15)",
                        border: `1px solid ${"rgba(122,158,126,0.5)"}`,
                        borderRadius: 4,
                        padding: "2px 10px",
                        color: "#4a7a44",
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
                border: `1px solid ${"rgba(58,46,30,0.25)"}`,
                borderRadius: 4,
                color: "#3a2e1e",
                padding: "4px 12px",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 13,
                flexShrink: 0,
              }}>
                close [`]
              </button>
            </div>

            {/* Body */}
            <div style={{
              flex: popup.embedUrl ? 1 : undefined,
              display: "flex",
              flexDirection: "column",
              overflow: popup.embedUrl ? "hidden" : "auto",
              background: "#fef9ec",
            }}>
              {popup.description && (
                <p style={{
                  color: "#3a2e1e",
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
                        background: "rgba(122,158,126,0.15)",
                        border: `1px solid ${"rgba(122,158,126,0.55)"}`,
                        borderRadius: 4,
                        padding: "8px 16px",
                        color: "#3a2e1e",
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
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
