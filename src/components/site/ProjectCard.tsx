"use client";

import type { ExhibitPopup } from "@/data/projects";

interface ProjectCardProps {
  index: string;   // e.g. "01"
  popup: ExhibitPopup;
  compact?: boolean;
  /** Open the full exhibit (grouped skills, demo, etc.). The whole card triggers this. */
  onOpen?: () => void;
}

export default function ProjectCard({ index, popup, compact = false, onOpen }: ProjectCardProps) {
  const ytId = popup.embedUrl?.match(/embed\/([\w-]+)/)?.[1];
  const hasMedia = !!(popup.videoUrl || ytId);
  return (
    <article
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Open ${popup.title ?? "project"}` : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } } : undefined}
      className={`group flex flex-col rounded-xl border border-[rgb(var(--c-line-rgb)_/_0.12)] bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(122,158,126,0.6)] hover:shadow-[0_14px_36px_rgba(28,21,8,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 ${onOpen ? "cursor-pointer" : ""}`}
    >
      {/* Demo preview — local video autoplays muted; a YouTube embed shows its thumbnail. */}
      {hasMedia && (
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg border border-[rgb(var(--c-line-rgb)_/_0.1)] bg-black/5">
          {popup.videoUrl ? (
            <video src={popup.videoUrl} className="h-full w-full object-cover" muted loop autoPlay playsInline />
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

      <span className="font-mono text-[11px] tracking-[0.22em] text-pine">No. {index}</span>

      <h3 className="mt-2 font-display text-[19px] font-semibold leading-snug text-pine">
        {popup.title}
      </h3>

      {popup.description && (
        <p className={`mt-2 flex-1 font-sans text-[14px] leading-relaxed dark:leading-[1.72] text-walnut/80 ${compact ? "line-clamp-3" : "line-clamp-4"}`}>
          {popup.description}
        </p>
      )}

      {popup.tech && popup.tech.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {popup.tech.slice(0, compact ? 4 : 8).map((t) => (
            <span
              key={t}
              className="rounded border border-[rgba(122,158,126,0.45)] bg-[rgba(122,158,126,0.12)] px-2 py-0.5 font-mono text-[11px] text-pine"
            >
              {t}
            </span>
          ))}
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
