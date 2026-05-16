"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import type { ResumeData, ResumeEntry, ResumeSection } from "@/app/api/resume/route";

// Human-readable short labels for known section titles
const DISPLAY_LABELS: Record<string, string> = {
  "WORK EXPERIENCE":        "Experience",
  "EDUCATION":              "Education",
  "PROJECTS":               "Projects",
  "SKILLS":                 "Skills",
  "AWARDS AND ACHIEVEMENTS":"Awards",
};

function sectionLabel(title: string): string {
  return DISPLAY_LABELS[title] ?? title.split(" ").map(
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(" ");
}

interface ResumePopupProps {
  onClose: () => void;
}

export default function ResumePopup({ onClose }: ResumePopupProps) {
  const [data, setData] = useState<ResumeData | null>(null);
  const [error, setError] = useState(false);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(true); return; }
        const parsed = d as ResumeData;
        setData(parsed);
        // Default to first section
        if (parsed.sections.length > 0) setActiveTitle(parsed.sections[0].title);
      })
      .catch(() => setError(true));
  }, []);

  const section: ResumeSection | undefined = data?.sections.find(
    (s) => s.title === activeTitle
  );

  useEffect(() => {
    if (!data) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const idx = data.sections.findIndex((s) => s.title === activeTitle);
      const next = e.key === "ArrowLeft"
        ? (idx - 1 + data.sections.length) % data.sections.length
        : (idx + 1) % data.sections.length;
      setActiveTitle(data.sections[next].title);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [data, activeTitle]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="resume-backdrop"
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

      {/* Popup shell */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 30,
          width: "min(860px, 95vw)",
          maxHeight: "min(640px, 92vh)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <motion.div
          key="resume-popup"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          style={{
            width: "100%",
            height: "100%",
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
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div
            style={{
              padding: "16px 20px 12px",
              borderBottom: `1px solid ${"rgba(58,46,30,0.15)"}`,
              flexShrink: 0,
              background: "#fef9ec",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2
                  style={{
                    color: "#4a7a44",
                    fontFamily: "monospace",
                    fontSize: 24,
                    margin: 0,
                    letterSpacing: 1,
                  }}
                >
                  {data?.name ?? "Resume"}
                </h2>
                {data && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px 14px",
                      marginTop: 6,
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#3a2e1e",
                      opacity: 0.8,
                    }}
                  >
                    {data.contact.phone && <span>{data.contact.phone}</span>}
                    {data.contact.email && <span>{data.contact.email}</span>}
                    {data.contact.linkedin && (
                      <a
                        href={`https://${data.contact.linkedin.replace(/^https?:\/\//, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#4a7a44", textDecoration: "none" }}
                      >
                        LinkedIn ↗
                      </a>
                    )}
                    {data.contact.github && (
                      <a
                        href={data.contact.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#4a7a44", textDecoration: "none" }}
                      >
                        GitHub ↗
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {data && (
                  <a
                    href={data.pdfPath}
                    download
                    style={{
                      background: "rgba(122,158,126,0.15)",
                      border: `1px solid ${"rgba(122,158,126,0.55)"}`,
                      borderRadius: 4,
                      padding: "4px 12px",
                      color: "#3a2e1e",
                      fontFamily: "monospace",
                      fontSize: 12,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Download PDF
                  </a>
                )}
                <button
                  onClick={onClose}
                  style={{
                    background: "none",
                    border: `1px solid ${"rgba(58,46,30,0.25)"}`,
                    borderRadius: 4,
                    color: "#3a2e1e",
                    padding: "4px 12px",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: 13,
                  }}
                >
                  close [`]
                </button>
              </div>
            </div>

            {/* Tab bar — generated from parsed sections */}
            <div
              style={{
                display: "flex",
                gap: 4,
                marginTop: 12,
                borderBottom: `1px solid ${"rgba(58,46,30,0.15)"}`,
                paddingBottom: 0,
              }}
            >
              {(data?.sections ?? []).map((s) => {
                const active = s.title === activeTitle;
                return (
                  <button
                    key={s.title}
                    onClick={() => setActiveTitle(s.title)}
                    style={{
                      background: active ? "rgba(122,158,126,0.15)" : "none",
                      border: `1px solid ${active ? "rgba(122,158,126,0.5)" : "transparent"}`,
                      borderBottom: active ? `1px solid ${"#fef9ec"}` : "1px solid transparent",
                      borderRadius: "4px 4px 0 0",
                      padding: "5px 14px",
                      color: active ? "#4a7a44" : "#3a2e1e",
                      fontFamily: "monospace",
                      fontSize: 12,
                      cursor: "pointer",
                      marginBottom: -1,
                      opacity: active ? 1 : 0.6,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {sectionLabel(s.title)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 24px",
              background: "#fef9ec",
            }}
          >
            {!data && !error && <LoadingState />}
            {error && <ErrorState />}

            {data && section && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTitle}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Entry-based sections */}
                  {section.entries && section.entries.map((entry, i) => (
                    <EntryCard key={i} entry={entry} />
                  ))}

                  {/* Flat-bullet sections */}
                  {section.bullets && (
                    <BulletList bullets={section.bullets} styled={section.title === "SKILLS"} />
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {data && !section && (
              <p style={{ fontFamily: "monospace", fontSize: 13, color: "#3a2e1e", opacity: 0.5 }}>
                No data found for this section.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function EntryCard({ entry }: { entry: ResumeEntry }) {
  return (
    <div
      style={{
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: `1px solid ${"rgba(58,46,30,0.15)"}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "2px 12px",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 14,
            fontWeight: "bold",
            color: "#4a7a44",
          }}
        >
          {entry.title}
        </span>
        {entry.period && (
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "#3a2e1e",
              opacity: 0.6,
              whiteSpace: "nowrap",
            }}
          >
            {entry.period}
          </span>
        )}
      </div>

      {(entry.subtitle || entry.location) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 12,
            color: "#3a2e1e",
            opacity: 0.75,
            marginTop: 2,
          }}
        >
          <span>{entry.subtitle}</span>
          <span>{entry.location}</span>
        </div>
      )}

      {entry.tech && entry.tech.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
          {entry.tech.map((t) => (
            <span
              key={t}
              style={{
                background: "rgba(122,158,126,0.15)",
                border: `1px solid ${"rgba(122,158,126,0.5)"}`,
                borderRadius: 4,
                padding: "1px 8px",
                fontFamily: "monospace",
                fontSize: 11,
                color: "#4a7a44",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {entry.bullets.length > 0 && (
        <ul
          style={{
            margin: "10px 0 0",
            padding: "0 0 0 16px",
            listStyle: "disc",
          }}
        >
          {entry.bullets.map((b, i) => (
            <li
              key={i}
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: "#3a2e1e",
                lineHeight: 1.65,
                marginBottom: 4,
              }}
            >
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BulletList({ bullets, styled }: { bullets: string[]; styled?: boolean }) {
  if (styled) {
    // For Skills: render as labeled categories
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {bullets.map((b, i) => {
          const colonIdx = b.indexOf(":");
          const label = colonIdx !== -1 ? b.slice(0, colonIdx) : null;
          const value = colonIdx !== -1 ? b.slice(colonIdx + 1).trim() : b;
          const items = value.split(",").map((s) => s.trim()).filter(Boolean);
          return (
            <div key={i}>
              {label && (
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#4a7a44",
                    fontWeight: "bold",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {label}
                </span>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {items.map((item) => (
                  <span
                    key={item}
                    style={{
                      background: "rgba(122,158,126,0.15)",
                      border: `1px solid ${"rgba(122,158,126,0.5)"}`,
                      borderRadius: 4,
                      padding: "2px 10px",
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#4a7a44",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc" }}>
      {bullets.map((b, i) => (
        <li
          key={i}
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: "#3a2e1e",
            lineHeight: 1.7,
            marginBottom: 6,
          }}
        >
          {b}
        </li>
      ))}
    </ul>
  );
}

function LoadingState() {
  return (
    <p style={{ fontFamily: "monospace", fontSize: 13, color: "#3a2e1e", opacity: 0.5 }}>
      Scanning resume...
    </p>
  );
}

function ErrorState() {
  return (
    <p style={{ fontFamily: "monospace", fontSize: 13, color: "#c00" }}>
      Failed to load resume data.
    </p>
  );
}
