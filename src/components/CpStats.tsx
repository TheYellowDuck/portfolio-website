"use client";

import { useEffect, useState } from "react";

interface LeetCode {
  total: number; easy: number; medium: number; hard: number;
  ranking: number | null; contestRating: number | null; contestBadge: string | null; url: string;
}
interface Dmoj { solved: number; points: number | null; rating: number | null; url: string; }
interface CpData { leetcode: LeetCode | null; dmoj: Dmoj | null }

// Module-level cache so the portfolio section and the exhibit popup share one fetch.
let cache: CpData | null = null;

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
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
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
            className="rounded border px-1.5 py-0.5 font-medium"
            style={{ color: tierColor(rating), borderColor: `${tierColor(rating)}66`, background: `${tierColor(rating)}1a` }}
          >
            ⚔ {rating.toLocaleString()}{ratingNote ? ` · ${ratingNote}` : ""}
          </span>
        )}
        {children}
      </div>
    </a>
  );
}

/** Live LeetCode + DMOJ stats, fetched from /api/cp-stats (cached/revalidated daily server-side). */
export default function CpStats() {
  const [data, setData] = useState<CpData | null>(cache);

  useEffect(() => {
    if (cache) return;
    let live = true;
    fetch("/api/cp-stats")
      .then((r) => r.json())
      .then((d: CpData) => { cache = d; if (live) setData(d); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const lc = data?.leetcode;
  const dm = data?.dmoj;
  if (data && !lc && !dm) return null; // both unavailable — show nothing rather than an empty shell

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(!data || lc) && (
        <StatCard
          label="LeetCode"
          href={lc?.url ?? "https://leetcode.com/u/georgezhang006/"}
          big={lc?.total ?? null}
          unit="solved"
          meta={lc?.ranking != null ? `rank #${lc.ranking.toLocaleString()}` : undefined}
          rating={lc?.contestRating}
          ratingNote={lc?.contestBadge}
        >
          <span className="flex gap-3">
            {DIFF.map((d) => (
              <span key={d.label} style={{ color: d.color }}>{d.label} {lc ? d.val(lc) : "—"}</span>
            ))}
          </span>
        </StatCard>
      )}
      {(!data || dm) && (
        <StatCard
          label="DMOJ"
          href={dm?.url ?? "https://dmoj.ca/user/georgezhang006"}
          big={dm?.solved ?? null}
          unit="solved"
          meta={dm?.points != null ? `${dm.points.toLocaleString()} pts` : undefined}
          rating={dm?.rating}
        >
          CCC · DMOPC · & more
        </StatCard>
      )}
    </div>
  );
}
