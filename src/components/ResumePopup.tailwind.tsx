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

interface ResumePopupProps {
  onClose: () => void;
}

export default function ResumePopup({ onClose }: ResumePopupProps) {
  const [data, setData]          = useState<ResumeData | null>(null);
  const [error, setError]        = useState(false);
  const [activeTitle, setActive] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(true); return; }
        const parsed = d as ResumeData;
        setData(parsed);
        if (parsed.sections.length > 0) setActive(parsed.sections[0].title);
      })
      .catch(() => setError(true));
  }, []);

  const section = data?.sections.find((s) => s.title === activeTitle);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="resume-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-20 bg-black/55 backdrop-blur-sm"
      />

      {/* Window */}
      <div className="fixed top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 w-[min(860px,95vw)] h-[min(640px,92vh)]">
        <motion.div
          key="resume-popup"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1,   y: 0  }}
          exit={{    opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="flex flex-col h-full overflow-hidden rounded-xl border border-white/8 bg-panel shadow-[0_32px_80px_rgba(0,0,0,0.72)]"
        >
          {/* ── Title bar ─────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center gap-3 px-4 py-3 bg-panel-2 border-b border-white/6">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onClose}
                aria-label="Close"
                className="size-3 rounded-full bg-[#ff5f57] border-none cursor-pointer transition-opacity hover:opacity-75"
              />
              <div className="size-3 rounded-full bg-[#febc2e]" />
              <div className="size-3 rounded-full bg-[#28c840]" />
            </div>

            <span className="flex-1 text-center font-mono text-[11px] text-ink-4 select-none">
              resume.pdf
            </span>

            {data && (
              <a
                href={data.pdfPath}
                download
                className="font-mono text-[11px] text-ink-4 no-underline transition-colors hover:text-ink-2"
              >
                download ↓
              </a>
            )}
          </div>

          {/* ── Body: sidebar + content ────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">

            {/* Sidebar */}
            <div className="w-[210px] shrink-0 bg-[#1d1809] border-r border-white/6 overflow-y-auto flex flex-col">
              {data && (
                <>
                  {/* Identity */}
                  <div className="px-5 pt-6 pb-5 border-b border-white/6">
                    <p className="font-mono text-[13px] font-semibold text-[#f0e4c4] leading-snug m-0">
                      {data.name}
                    </p>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {data.contact.email && (
                        <span className="font-mono text-[11px] text-[#7a6a4a] truncate">
                          {data.contact.email}
                        </span>
                      )}
                      {data.contact.phone && (
                        <span className="font-mono text-[11px] text-[#7a6a4a]">
                          {data.contact.phone}
                        </span>
                      )}
                      {data.contact.linkedin && (
                        <a
                          href={`https://${data.contact.linkedin.replace(/^https?:\/\//, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[11px] text-[#7a9e7e] no-underline transition-colors hover:text-[#f0e4c4]"
                        >
                          LinkedIn ↗
                        </a>
                      )}
                      {data.contact.github && (
                        <a
                          href={data.contact.github}
                          target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[11px] text-[#7a9e7e] no-underline transition-colors hover:text-[#f0e4c4]"
                        >
                          GitHub ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Section nav */}
                  <nav className="py-2 flex flex-col">
                    {data.sections.map((s) => {
                      const active = s.title === activeTitle;
                      return (
                        <button
                          key={s.title}
                          onClick={() => setActive(s.title)}
                          className={`relative w-full text-left px-5 py-2.5 font-mono text-[13px] border-none cursor-pointer transition-colors duration-150 ${
                            active
                              ? "text-[#f0e4c4] bg-white/5"
                              : "text-[#7a6a4a] bg-transparent hover:text-ink-2 hover:bg-white/3"
                          }`}
                        >
                          {active && (
                            <span className="absolute left-0 top-[6px] bottom-[6px] w-0.5 rounded-r-full bg-[#7a9e7e]" />
                          )}
                          {sectionLabel(s.title)}
                        </button>
                      );
                    })}
                  </nav>
                </>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {!data && !error && (
                <div className="flex h-full items-center justify-center">
                  <p className="font-mono text-[13px] text-ink-4">Scanning resume…</p>
                </div>
              )}
              {error && (
                <div className="flex h-full items-center justify-center">
                  <p className="font-mono text-[13px] text-red-400/70">Failed to load resume.</p>
                </div>
              )}

              {section && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTitle}
                    initial={{ opacity: 0, y: 6  }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={{    opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="px-8 py-7"
                  >
                    <p className="mb-6 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-4">
                      {sectionLabel(section.title)}
                    </p>

                    {section.entries?.map((entry, i) => (
                      <EntryCard
                        key={i}
                        entry={entry}
                        last={i === (section.entries!.length - 1)}
                      />
                    ))}

                    {section.bullets && (
                      <BulletList
                        bullets={section.bullets}
                        styled={section.title === "SKILLS"}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* ── Entry card ─────────────────────────────────────────────────────────── */

function EntryCard({ entry, last }: { entry: ResumeEntry; last: boolean }) {
  return (
    <div className={`py-5 ${last ? "" : "border-b border-white/6"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-mono text-[13px] font-semibold text-[#f0e4c4]">
          {entry.title}
        </span>
        {entry.period && (
          <span className="shrink-0 font-mono text-[11px] text-ink-4">
            {entry.period}
          </span>
        )}
      </div>

      {(entry.subtitle || entry.location) && (
        <div className="mt-1 flex justify-between font-mono text-[11px] text-[#7a6a4a]">
          <span>{entry.subtitle}</span>
          <span>{entry.location}</span>
        </div>
      )}

      {entry.tech && entry.tech.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.tech.map((t) => (
            <span
              key={t}
              className="font-mono text-[11px] text-[#7a9e7e] bg-[rgba(122,158,126,0.10)] border border-[rgba(122,158,126,0.28)] rounded-[5px] px-2.5 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {entry.bullets.length > 0 && (
        <ul className="mt-3 pl-4 flex flex-col gap-1.5 list-disc">
          {entry.bullets.map((b, i) => (
            <li key={i} className="font-mono text-[11px] leading-relaxed text-[#b8a880]">
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Bullet list (Skills / Awards) ─────────────────────────────────────── */

function BulletList({ bullets, styled }: { bullets: string[]; styled?: boolean }) {
  if (styled) {
    return (
      <div className="flex flex-col gap-6">
        {bullets.map((b, i) => {
          const colon = b.indexOf(":");
          const label = colon !== -1 ? b.slice(0, colon) : null;
          const value = colon !== -1 ? b.slice(colon + 1).trim() : b;
          const items = value.split(",").map((s) => s.trim()).filter(Boolean);
          return (
            <div key={i}>
              {label && (
                <p className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-4">
                  {label}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <span
                    key={item}
                    className="font-mono text-[11px] text-[#7a9e7e] bg-[rgba(122,158,126,0.10)] border border-[rgba(122,158,126,0.28)] rounded-[5px] px-3 py-1"
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
    <ul className="pl-4 flex flex-col gap-2.5 list-disc">
      {bullets.map((b, i) => (
        <li key={i} className="font-mono text-[13px] leading-relaxed text-[#b8a880]">
          {b}
        </li>
      ))}
    </ul>
  );
}
