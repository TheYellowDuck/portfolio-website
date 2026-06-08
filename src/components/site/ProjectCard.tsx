"use client";

import type { ExhibitPopup } from "@/data/projects";

interface ProjectCardProps {
  index: string;   // e.g. "01"
  popup: ExhibitPopup;
  compact?: boolean;
}

export default function ProjectCard({ index, popup, compact = false }: ProjectCardProps) {
  const hasDemo = !!(popup.embedUrl || popup.videoUrl);
  return (
    <article className="group flex flex-col rounded-xl border border-[rgba(58,46,30,0.12)] bg-[#fffdf7] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(122,158,126,0.6)] hover:shadow-[0_14px_36px_rgba(28,21,8,0.12)]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.22em] text-sage">No. {index}</span>
        {hasDemo && (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-pine/70">
            ▶ playable
          </span>
        )}
      </div>

      <h3 className="mt-2 font-sans text-[19px] font-semibold leading-snug text-pine">
        {popup.title}
      </h3>

      {popup.description && (
        <p className={`mt-2 flex-1 font-sans text-[14px] leading-relaxed text-walnut/80 ${compact ? "line-clamp-3" : "line-clamp-4"}`}>
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
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {popup.links.map((l) => (
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
      )}
    </article>
  );
}
