// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect, useRef, useState } from "react";
import type { ExhibitPopup } from "@/data/projects";
import { videoPoster } from "@/lib/video";
import { content } from "@/content";
import { skillColorFor } from "@/lib/skill-colors";
import { useDarkMode } from "@/lib/use-dark-mode";
import { useTilt } from "@/lib/use-tilt";

/**
 * A muted autoplay preview that only fetches its source once it's near the viewport — so a page of
 * cards doesn't download and decode every clip up front (the heaviest cost on mobile). The poster
 * shows immediately; the real video swaps in within `rootMargin` of being scrolled into view.
 */
export function LazyVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || load) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setLoad(true); io.disconnect(); }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load]);
  return (
    <video
      ref={ref}
      src={load ? src : undefined}
      poster={poster}
      className={className}
      muted
      loop
      autoPlay
      playsInline
      preload={load ? "auto" : "none"}
    />
  );
}

interface ProjectCardProps {
  index?: string;   // e.g. "01" — omitted for in-progress cards, which show a status pill instead
  popup: ExhibitPopup;
  compact?: boolean;
  /** Actively-built project: show an "In progress" pill in place of the No. NN ranking index. */
  inProgress?: boolean;
  /** Open the full exhibit (grouped skills, demo, etc.). The whole card triggers this. */
  onOpen?: () => void;
}

export default function ProjectCard({ index, popup, compact = false, inProgress = false, onOpen }: ProjectCardProps) {
  const dark = useDarkMode();
  // 3D lean toward the pointer — lift folds in the hover:-translate-y-1 the inline transform overrides.
  const tiltRef = useTilt<HTMLElement>({ max: 6, lift: 4 });
  const ytId = popup.embedUrl?.match(/embed\/([\w-]+)/)?.[1];
  const hasMedia = !!(popup.videoUrl || ytId);
  return (
    <article
      ref={tiltRef}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      data-cursor={onOpen ? "Open" : undefined}
      aria-label={onOpen ? `Open ${popup.title ?? "project"}` : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } } : undefined}
      className={`group flex flex-col rounded-xl border border-[rgb(var(--c-line-rgb)_/_0.12)] bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(122,158,126,0.6)] hover:shadow-[0_14px_36px_rgba(28,21,8,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 ${onOpen ? "cursor-pointer" : ""}`}
    >
      {/* Demo preview — local video autoplays muted; a YouTube embed shows its thumbnail. */}
      {hasMedia && (
        <div data-depth="40" className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border border-[rgb(var(--c-line-rgb)_/_0.1)] bg-black/5">
          {popup.videoUrl ? (
            <LazyVideo src={popup.videoUrl} poster={videoPoster(popup.videoUrl)} className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(https://img.youtube.com/vi/${ytId}/hqdefault.jpg)` }} />
              <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/5">
                {/* Inline SVG play triangle — the ▶ glyph renders as a colored emoji on mobile. */}
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-walnut shadow-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            </>
          )}
        </div>
      )}

      {inProgress ? (
        <span data-depth="18" className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(122,158,126,0.5)] bg-[rgba(122,158,126,0.12)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-pine">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden="true" />
          {content.sections.work.inProgressTag}
        </span>
      ) : (
        <span data-depth="18" className="font-mono text-[11px] tracking-[0.22em] text-pine">No. {index}</span>
      )}

      <h3 data-depth="26" className="mt-2 font-display text-[19px] font-semibold leading-snug text-pine">
        {popup.title}
      </h3>

      {popup.description && (
        <p className={`mt-2 flex-1 font-sans text-[14px] leading-relaxed dark:leading-[1.72] text-walnut/80 ${compact ? "line-clamp-3" : "line-clamp-4"}`}>
          {popup.description}
        </p>
      )}

      {popup.tech && popup.tech.length > 0 && (
        <div data-depth="14" className="mt-4 flex flex-wrap gap-1.5">
          {popup.tech.slice(0, compact ? 4 : 8).map((t) => {
            const c = skillColorFor(t);
            return (
              <span
                key={t}
                className="rounded border px-2 py-0.5 font-mono text-[11px]"
                style={{ borderColor: c.border, background: c.bg, color: dark ? c.solidDark : c.solid }}
              >
                {t}
              </span>
            );
          })}
        </div>
      )}

      {popup.links && popup.links.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          {popup.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-[13px] text-walnut/75 underline decoration-sage/40 underline-offset-4 transition-colors hover:text-pine hover:decoration-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
