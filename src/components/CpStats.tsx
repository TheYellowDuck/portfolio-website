// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import cpStatsJson from "@/data/cp-stats.generated.json";
import { useTilt } from "@/lib/use-tilt";

interface LeetCode {
  total: number; easy: number; medium: number; hard: number;
  ranking: number | null; contestRating: number | null; contestBadge: string | null; url: string;
}
interface Dmoj { solved: number; points: number | null; rating: number | null; url: string; }

// Built daily by scripts/sync-cp-stats.mjs (the same GitHub Action that syncs projects), so the page
// serves these statically — no runtime LeetCode fetch from a datacenter IP that Cloudflare would block.
const STATS = cpStatsJson as { leetcode: LeetCode | null; dmoj: Dmoj | null };

const DIFF: { label: string; color: string; val: (l: LeetCode) => number }[] = [
  { label: "Easy", color: "#3a9b6e", val: (l) => l.easy },
  { label: "Med", color: "#c08a2e", val: (l) => l.medium },
  { label: "Hard", color: "#c0504d", val: (l) => l.hard },
];

// Rating → competitive-programming tier colour (Codeforces-style bands; approximate for both sites).
function tierColor(r: number): string {
  if (r < 1200) return "#8a8a8a";
  if (r < 1500) return "#3a9b6e";
  if (r < 1800) return "#2f6fb0";
  if (r < 2100) return "#8a5cc0";
  if (r < 2400) return "#c08a2e";
  return "#c0504d";
}

function StatCard({
  label, href, big, unit, meta, rating, ratingNote, children,
}: {
  label: string; href: string; big: number | null; unit: string; meta?: string;
  rating?: number | null; ratingNote?: string | null; children?: React.ReactNode;
}) {
  // 3D lean toward the pointer, like every other card on the wall.
  const tiltRef = useTilt<HTMLAnchorElement>({ max: 4 });
  return (
    <a
      ref={tiltRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor="Visit"
      className="group rounded-xl border border-[rgb(var(--c-line-rgb)_/_0.12)] bg-surface p-4 transition-colors hover:border-[rgba(122,158,126,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-pine">{label}</span>
        <span className="font-mono text-[11px] text-walnut/55">{meta ?? ""}</span>
      </div>
      <div className="mt-1.5 font-display text-[30px] font-semibold leading-none text-walnut">
        {big ?? "—"}
        <span className="ml-1.5 font-sans text-[13px] font-normal text-walnut/55">{unit}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-walnut/60">
        {rating != null && (
          <span
            className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-medium"
            style={{ color: tierColor(rating), borderColor: `${tierColor(rating)}66`, background: `${tierColor(rating)}1a` }}
          >
            {/* trend-up SVG — the ⚔ glyph renders as a colored emoji on mobile */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 17l5-5 4 4 8-8" />
            </svg>
            {rating.toLocaleString()}{ratingNote ? ` · ${ratingNote}` : ""}
          </span>
        )}
        {children}
      </div>
    </a>
  );
}

/** LeetCode + DMOJ stats, served from a static file synced daily by the GitHub Action. */
export default function CpStats() {
  const lc = STATS.leetcode;
  const dm = STATS.dmoj;
  if (!lc && !dm) return null; // both unavailable — show nothing rather than an empty shell

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {lc && (
        <StatCard
          label="LeetCode"
          href={lc.url}
          big={lc.total}
          unit="solved"
          meta={lc.ranking != null ? `rank #${lc.ranking.toLocaleString()}` : undefined}
          rating={lc.contestRating}
          ratingNote={lc.contestBadge}
        >
          <span className="flex gap-3">
            {DIFF.map((d) => (
              <span key={d.label} style={{ color: d.color }}>{d.label} {d.val(lc)}</span>
            ))}
          </span>
        </StatCard>
      )}
      {dm && (
        <StatCard
          label="DMOJ"
          href={dm.url}
          big={dm.solved}
          unit="solved"
          meta={dm.points != null ? `${dm.points.toLocaleString()} pts` : undefined}
          rating={dm.rating}
        >
          CCC · DMOPC · & more
        </StatCard>
      )}
    </div>
  );
}
