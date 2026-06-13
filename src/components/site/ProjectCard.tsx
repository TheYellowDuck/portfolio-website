"use client";

import type { ExhibitPopup } from "@/data/projects";

interface ProjectCardProps {
  index: string;   // e.g. "01"
  popup: ExhibitPopup;
  compact?: boolean;
  /** Open the full exhibit (grouped skills, playable demo, etc.). */
  onOpen?: () => void;
}

export default function ProjectCard({ index, popup, compact = false, onOpen }: ProjectCardProps) {
  const hasDemo = !!(popup.embedUrl || popup.videoUrl);
  // Only offer details when there's meaningfully more than the card already shows.
  const hasMore = !!(popup.skills?.length || hasDemo);
  const ytId = popup.embedUrl?.match(/embed\/([\w-]+)/)?.[1];
  const hasMedia = !!(popup.videoUrl || ytId);
  return (
    <article className="group flex flex-col rounded-xl border border-[rgb(var(--c-line-rgb)_/_0.12)] bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(122,158,126,0.6)] hover:shadow-[0_14px_36px_rgba(28,21,8,0.12)]">
      {/* Demo preview — local video autoplays muted; a YouTube embed shows its thumbnail. */}
      {hasMedia && (
        <button
          onClick={onOpen}
          aria-label="Open demo"
          className="relative mb-4 block aspect-video w-full overflow-hidden rounded-lg border border-[rgb(var(--c-line-rgb)_/_0.1)] bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
        >
          {popup.videoUrl ? (
            <video src={popup.videoUrl} className="h-full w-full object-cover" muted loop autoPlay playsInline />
          ) : (
            <>
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(https://img.youtube.com/vi/${ytId}/hqdefault.jpg)` }} />
              <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 pl-0.5 text-[15px] text-walnut shadow-lg">▶</span>
              </span>
            </>
          )}
        </button>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.22em] text-pine">No. {index}</span>
        {hasDemo && (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-pine/70">
            ▶ playable
          </span>
        )}
      </div>

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

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        {hasMore && onOpen && (
          <button
            onClick={onOpen}
            className="font-mono text-[13px] text-pine underline decoration-sage/50 underline-offset-4 transition-colors hover:decoration-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
          >
            Details →
          </button>
        )}
        {popup.links?.map((l) => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[13px] text-walnut/75 underline decoration-sage/40 underline-offset-4 transition-colors hover:text-pine hover:decoration-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
          >
            {l.label} ↗
          </a>
        ))}
      </div>
    </article>
  );
}
