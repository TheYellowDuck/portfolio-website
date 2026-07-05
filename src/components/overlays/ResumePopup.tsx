// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResumeCollection, ResumeVariant, ResumeEntry, ResumeSection } from "@/types/resume";
import { PressButton } from "@/components/PressButton";
import { useTilt } from "@/lib/use-tilt";

const DISPLAY_LABELS: Record<string, string> = {
  "WORK EXPERIENCE":         "Experience",
  "EDUCATION":               "Education",
  "PROJECTS":                "Projects",
  "SKILLS":                  "Skills",
  "AWARDS AND ACHIEVEMENTS": "Awards",
};

function sectionLabel(title: string): string {
  return DISPLAY_LABELS[title] ?? title.split(" ").map(
    (w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)
  ).join(" ");
}

// Accept the new multi-variant shape, but tolerate an older single-résumé JSON (or a stale cache)
// by wrapping it as a one-entry collection.
function toCollection(d: ResumeCollection | (Omit<ResumeCollection, "variants"> & { variants?: ResumeVariant[] })): ResumeCollection {
  if (Array.isArray(d.variants) && d.variants.length > 0) return d as ResumeCollection;
  const { name, contact, sections, pdfPath } = d;
  return { name, contact, sections, pdfPath, variants: [{ id: "resume", label: "Résumé", name, contact, sections, pdfPath }] };
}

const hrefify = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

let resumeCache: ResumeCollection | null = null;

interface ResumePopupProps {
  onClose: () => void;
}

export default function ResumePopup({ onClose }: ResumePopupProps) {
  // Whisper-subtle 3D lean on the popup card (it's a large reading surface).
  const popupTilt = useTilt<HTMLDivElement>({ max: 2 });
  const [collection, setCollection] = useState<ResumeCollection | null>(resumeCache);
  const [error, setError]           = useState(false);
  const [variantId, setVariantId]   = useState<string | null>(resumeCache?.variants[0]?.id ?? null);
  const [activeTitle, setActiveTitle] = useState<string | null>(
    resumeCache?.variants[0]?.sections[0]?.title ?? null
  );
  const tabBarRef = useRef<HTMLDivElement>(null); // section tab bar — lets a keyboard switch move focus with it

  useEffect(() => {
    if (resumeCache) return;
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(true); return; }
        const parsed = toCollection(d);
        resumeCache = parsed;
        setCollection(parsed);
        setVariantId(parsed.variants[0]?.id ?? null);
        setActiveTitle(parsed.variants[0]?.sections[0]?.title ?? null);
      })
      .catch(() => setError(true));
  }, []);

  const variants = collection?.variants ?? [];
  const variant: ResumeVariant | undefined = variants.find((v) => v.id === variantId) ?? variants[0];
  const section: ResumeSection | undefined = variant?.sections.find((s) => s.title === activeTitle);

  // Switch variant; keep the same section if the new variant has it (titles line up across variants).
  const selectVariant = (id: string) => {
    const next = variants.find((v) => v.id === id);
    if (!next) return;
    setVariantId(id);
    if (!next.sections.some((s) => s.title === activeTitle)) {
      setActiveTitle(next.sections[0]?.title ?? null);
    }
  };

  useEffect(() => {
    if (!variant) return;
    const handleKey = (e: KeyboardEvent) => {
      const prev = e.key === "ArrowLeft"  || e.key === "a" || e.key === "A";
      const next = e.key === "ArrowRight" || e.key === "d" || e.key === "D";
      if (!prev && !next) return;
      e.preventDefault();
      const idx     = variant.sections.findIndex((s) => s.title === activeTitle);
      const nextIdx = prev
        ? (idx - 1 + variant.sections.length) % variant.sections.length
        : (idx + 1) % variant.sections.length;
      const nextTitle = variant.sections[nextIdx].title;
      setActiveTitle(nextTitle);
      // If a section tab currently has focus, move it to the newly-selected tab so the focus ring
      // follows the active tab — rather than lingering (mismatched) on the tab you switched away from.
      const focused = document.activeElement as HTMLElement | null;
      if (focused?.dataset.sectionTab != null) {
        tabBarRef.current?.querySelector<HTMLElement>(`[data-section-tab="${nextTitle}"]`)?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [variant, activeTitle]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="resume-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-20 bg-[rgba(28,21,8,0.72)] backdrop-blur-sm"
      />

      {/* Centered popup — max-height on motion div constrains flex; body scrolls inside */}
      <div className="fixed top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "min(860px, 95vw)" }}
      >
        <motion.div
          key="resume-popup"
          ref={popupTilt}
          role="dialog"
          aria-modal="true"
          aria-label={collection?.name ?? "Résumé"}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full flex flex-col overflow-y-auto rounded-lg border-2 border-sage bg-parchment shadow-[0_8px_40px_rgba(28,21,8,0.35)] [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]"
          style={{ maxHeight: "min(640px, 80vh)" }}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="shrink-0 px-5 py-4 pb-3 border-b border-[rgb(var(--c-line-rgb)_/_0.15)] bg-parchment">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="m-0 font-mono text-[24px] text-pine tracking-[1px]">
                  {collection?.name ?? "Resume"}
                </h2>
                {collection && (
                  <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-1.5 font-mono text-[12px] text-walnut opacity-80">
                    {variant?.contact.phone && <span>{variant.contact.phone}</span>}
                    {variant?.contact.email && <span>{variant.contact.email}</span>}
                    {variant?.contact.linkedin && (
                      <a
                        href={`https://${variant.contact.linkedin.replace(/^https?:\/\//, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-pine no-underline transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
                      >
                        LinkedIn ↗
                      </a>
                    )}
                    {variant?.contact.github && (
                      <a
                        href={hrefify(variant.contact.github)}
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
                {variant && (
                  <a
                    href={variant.pdfPath}
                    download
                    className="font-mono text-[12px] text-walnut no-underline whitespace-nowrap bg-[rgba(122,158,126,0.15)] border border-[rgba(122,158,126,0.55)] rounded px-3 py-1 transition-colors hover:bg-[rgba(122,158,126,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                  >
                    Download PDF
                  </a>
                )}
                <PressButton
                  onClick={onClose}
                  autoFocus
                  aria-label="Close"
                  className="select-none bg-transparent border border-[rgb(var(--c-line-rgb)_/_0.25)] rounded text-walnut font-mono text-[13px] px-3 py-1 cursor-pointer transition-colors hover:bg-[rgb(var(--c-line-rgb)_/_0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                >
                  close [`]
                </PressButton>
              </div>
            </div>

            {/* Variant switcher — one tab per résumé in the resume/ folder */}
            {variants.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="font-mono text-[11px] text-walnut opacity-50 mr-0.5 uppercase tracking-wide">
                  Version
                </span>
                {variants.map((v) => {
                  const active = v.id === variant?.id;
                  return (
                    <PressButton
                      key={v.id}
                      onClick={() => selectVariant(v.id)}
                      aria-pressed={active}
                      className={[
                        // iOS Safari leaves a STALE painted layer when the bg both animates AND the element
                        // is promoted to its own compositing layer (a transition or element-opacity does
                        // that) — that's why deselected pills stayed green. Fix: NO transition (instant
                        // repaint in normal flow) and dim via the text colour's alpha, never element opacity.
                        "shrink-0 whitespace-nowrap font-mono text-[11px] px-2.5 py-1 cursor-pointer rounded-full border [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50",
                        active
                          ? "bg-pine text-parchment border-pine font-bold shadow-[0_1px_4px_rgba(28,21,8,0.25)]"
                          : "bg-transparent text-walnut/60 border-[rgb(var(--c-line-rgb)/0.25)]",
                      ].join(" ")}
                    >
                      {v.label}
                    </PressButton>
                  );
                })}
              </div>
            )}

            {/* Section tab bar */}
            <div className="flex items-end justify-between gap-2 mt-3 border-b border-[rgb(var(--c-line-rgb)_/_0.15)]">
              <div ref={tabBarRef} className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(variant?.sections ?? []).map((s) => {
                const active = s.title === activeTitle;
                return (
                  <PressButton
                    key={s.title}
                    data-section-tab={s.title}
                    onClick={() => setActiveTitle(s.title)}
                    className={[
                      "shrink-0 whitespace-nowrap font-mono text-[12px] px-3.5 py-1 cursor-pointer rounded-tl rounded-tr -mb-px border [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50",
                      active
                        ? "bg-[rgba(122,158,126,0.15)] border-[rgba(122,158,126,0.5)] border-b-parchment text-pine"
                        : "bg-transparent border-transparent text-walnut/60",
                    ].join(" ")}
                  >
                    {sectionLabel(s.title)}
                  </PressButton>
                );
              })}
              </div>
              <span className="hidden sm:block font-mono text-[11px] text-walnut opacity-40 pb-1 shrink-0">
                ← → or a / d to switch
              </span>
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────── */}
          <div className="px-6 py-4 bg-parchment">
            {!collection && !error && <LoadingState />}
            {error             && <ErrorState />}

            {variant && section && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${variant.id}:${activeTitle}`}
                  initial={{ opacity: 0, y: 6  }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{    opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {section.entries?.map((entry, i) => (
                    <EntryCard key={i} entry={entry} />
                  ))}
                  {section.bullets && (
                    <BulletList bullets={section.bullets} styled={/skill/i.test(section.title)} />
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {variant && !section && (
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
    <div className="mb-6 pb-5 border-b border-[rgb(var(--c-line-rgb)_/_0.15)]">
      <div className="flex justify-between items-start flex-wrap gap-x-3 gap-y-0.5">
        <span className="font-mono text-[14px] font-bold text-pine">
          {entry.title}
        </span>
        {entry.period ? (
          <span className="shrink-0 font-mono text-[12px] text-walnut opacity-60 whitespace-nowrap">
            {entry.period}
          </span>
        ) : entry.link ? (
          <a
            href={hrefify(entry.link)}
            target="_blank" rel="noopener noreferrer"
            className="shrink-0 font-mono text-[12px] text-pine no-underline opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
          >
            {entry.link.replace(/^https?:\/\//, "")} ↗
          </a>
        ) : null}
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
