"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResumeData, ResumeEntry, ResumeSection } from "@/app/api/resume/route";

const DISPLAY_LABELS: Record<string, string> = {
  "WORK EXPERIENCE":         "Experience",
  "EDUCATION":               "Education",
  "PROJECTS":                "Projects",
  "SKILLS":                  "Skills",
  "AWARDS AND ACHIEVEMENTS": "Awards",
};

function sectionLabel(title: string): string {
  return DISPLAY_LABELS[title] ?? title.split(" ").map(
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(" ");
}

let resumeCache: ResumeData | null = null;

interface ResumePopupProps {
  onClose: () => void;
}

export default function ResumePopup({ onClose }: ResumePopupProps) {
  const [data, setData]               = useState<ResumeData | null>(resumeCache);
  const [error, setError]             = useState(false);
  const [activeTitle, setActiveTitle] = useState<string | null>(
    resumeCache?.sections[0]?.title ?? null
  );

  useEffect(() => {
    if (resumeCache) return;
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(true); return; }
        const parsed = d as ResumeData;
        resumeCache = parsed;
        setData(parsed);
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
      const prev = e.key === "ArrowLeft"  || e.key === "a" || e.key === "A";
      const next = e.key === "ArrowRight" || e.key === "d" || e.key === "D";
      if (!prev && !next) return;
      e.preventDefault();
      const idx     = data.sections.findIndex((s) => s.title === activeTitle);
      const nextIdx = prev
        ? (idx - 1 + data.sections.length) % data.sections.length
        : (idx + 1) % data.sections.length;
      setActiveTitle(data.sections[nextIdx].title);
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
        className="fixed inset-0 z-20 bg-[rgba(28,21,8,0.72)] backdrop-blur-sm"
      />

      {/* Centered popup — max-height on motion div constrains flex; body scrolls inside */}
      <div className="fixed top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "min(860px, 95vw)" }}
      >
        <motion.div
          key="resume-popup"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full flex flex-col overflow-y-auto rounded-lg border-2 border-sage bg-parchment shadow-[0_8px_40px_rgba(28,21,8,0.35)] [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]"
          style={{ maxHeight: "min(640px, 80vh)" }}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="shrink-0 px-5 py-4 pb-3 border-b border-[rgba(58,46,30,0.15)] bg-parchment">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="m-0 font-mono text-[24px] text-pine tracking-[1px]">
                  {data?.name ?? "Resume"}
                </h2>
                {data && (
                  <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-1.5 font-mono text-[12px] text-walnut opacity-80">
                    {data.contact.phone && <span>{data.contact.phone}</span>}
                    {data.contact.email && <span>{data.contact.email}</span>}
                    {data.contact.linkedin && (
                      <a
                        href={`https://${data.contact.linkedin.replace(/^https?:\/\//, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-pine no-underline transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
                      >
                        LinkedIn ↗
                      </a>
                    )}
                    {data.contact.github && (
                      <a
                        href={data.contact.github}
                        target="_blank" rel="noopener noreferrer"
                        className="text-pine no-underline transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
                      >
                        GitHub ↗
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 items-center shrink-0">
                {data && (
                  <a
                    href={data.pdfPath}
                    download
                    className="font-mono text-[12px] text-walnut no-underline whitespace-nowrap bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.55)] rounded px-3 py-1 transition-colors hover:bg-[rgba(122,158,126,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                  >
                    Download PDF
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="select-none bg-transparent border border-[rgba(58,46,30,0.25)] rounded text-walnut font-mono text-[13px] px-3 py-1 cursor-pointer transition-colors hover:bg-[rgba(58,46,30,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                >
                  close [`]
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex items-end justify-between gap-2 mt-3 border-b border-[rgba(58,46,30,0.15)]">
              <div className="flex gap-1">
              {(data?.sections ?? []).map((s) => {
                const active = s.title === activeTitle;
                return (
                  <button
                    key={s.title}
                    onClick={() => setActiveTitle(s.title)}
                    className={[
                      "font-mono text-[12px] px-3.5 py-1 cursor-pointer rounded-tl rounded-tr -mb-px border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50",
                      active
                        ? "bg-[rgba(122,158,126,0.15)] border-[rgba(122,158,126,0.5)] border-b-parchment text-pine opacity-100"
                        : "bg-transparent border-transparent text-walnut opacity-60 hover:opacity-80",
                    ].join(" ")}
                  >
                    {sectionLabel(s.title)}
                  </button>
                );
              })}
              </div>
              <span className="font-mono text-[11px] text-walnut opacity-40 pb-1 shrink-0">
                ← → or a / d to switch
              </span>
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────── */}
          <div className="px-6 py-4 bg-parchment">
            {!data && !error && <LoadingState />}
            {error            && <ErrorState />}

            {data && section && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTitle}
                  initial={{ opacity: 0, y: 6  }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{    opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {section.entries?.map((entry, i) => (
                    <EntryCard key={i} entry={entry} />
                  ))}
                  {section.bullets && (
                    <BulletList bullets={section.bullets} styled={section.title === "SKILLS"} />
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {data && !section && (
              <p className="font-mono text-[13px] text-walnut opacity-50">
                No data found for this section.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function EntryCard({ entry }: { entry: ResumeEntry }) {
  return (
    <div className="mb-6 pb-5 border-b border-[rgba(58,46,30,0.15)]">
      <div className="flex justify-between items-start flex-wrap gap-x-3 gap-y-0.5">
        <span className="font-mono text-[14px] font-bold text-pine">
          {entry.title}
        </span>
        {entry.period && (
          <span className="shrink-0 font-mono text-[12px] text-walnut opacity-60 whitespace-nowrap">
            {entry.period}
          </span>
        )}
      </div>

      {(entry.subtitle || entry.location) && (
        <div className="flex justify-between font-mono text-[12px] text-walnut opacity-75 mt-0.5">
          <span>{entry.subtitle}</span>
          <span>{entry.location}</span>
        </div>
      )}

      {entry.tech && entry.tech.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {entry.tech.map((t) => (
            <span
              key={t}
              className="font-mono text-[11px] text-pine bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.5)] rounded px-2 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {entry.bullets.length > 0 && (
        <ul className="mt-2.5 pl-4 list-disc m-0">
          {entry.bullets.map((b, i) => (
            <li
              key={i}
              className="font-mono text-[12px] text-walnut leading-[1.65] mb-1"
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
    return (
      <div className="flex flex-col gap-2.5">
        {bullets.map((b, i) => {
          const colonIdx = b.indexOf(":");
          const label = colonIdx !== -1 ? b.slice(0, colonIdx) : null;
          const value = colonIdx !== -1 ? b.slice(colonIdx + 1).trim() : b;
          const items = value.split(",").map((s) => s.trim()).filter(Boolean);
          return (
            <div key={i}>
              {label && (
                <span className="block mb-1.5 font-mono text-[12px] text-pine font-bold">
                  {label}
                </span>
              )}
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span
                    key={item}
                    className="font-mono text-[12px] text-pine bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.5)] rounded px-2.5 py-0.5"
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
    <ul className="m-0 pl-4 list-disc">
      {bullets.map((b, i) => (
        <li
          key={i}
          className="font-mono text-[13px] text-walnut leading-[1.7] mb-1.5"
        >
          {b}
        </li>
      ))}
    </ul>
  );
}

function LoadingState() {
  return (
    <p className="font-mono text-[13px] text-walnut opacity-50">
      Scanning resume...
    </p>
  );
}

function ErrorState() {
  return (
    <p className="font-mono text-[13px] text-[#c00]">
      Failed to load resume data.
    </p>
  );
}
