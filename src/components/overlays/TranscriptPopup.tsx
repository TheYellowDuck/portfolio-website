"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TranscriptData, SubjectGroup, CourseEntry } from "@/types/transcript";
import { experienceExhibits } from "@/data/projects";

let transcriptCache: TranscriptData | null = null;

// "Computer Science, Honours, Co-operative Program" → "Computer Science · Honours Co-op"
function shortenProgram(program: string): string {
  return program
    .replace("Co-operative Program", "Co-op")
    .replace(", Honours,", " · Honours ·")
    .replace(/,\s*$/, "");
}

// Match a transcript term ("Spring 2025") to an experience date string ("Jun 2025 – Aug 2025")
const SEASON_MONTHS: Record<string, [number, number]> = {
  Fall: [8, 11], Winter: [0, 3], Spring: [4, 7], Summer: [4, 7],
};
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function termOverlapsDate(term: string, dateStr: string): boolean {
  const [season, yearStr] = term.split(" ");
  const year  = parseInt(yearStr);
  const range = SEASON_MONTHS[season];
  if (!range) return false;
  const m = dateStr.match(/(\w{3})\.?\s+(\d{4})/);
  if (!m) return false;
  const mo = MONTH_ABBR.findIndex(x => x.toLowerCase() === m[1].toLowerCase().slice(0, 3));
  return parseInt(m[2]) === year && mo >= range[0] && mo <= range[1];
}

interface TranscriptPopupProps {
  onClose: () => void;
}

export default function TranscriptPopup({ onClose }: TranscriptPopupProps) {
  const [data, setData]            = useState<TranscriptData | null>(transcriptCache);
  const [error, setError]          = useState(false);
  const [activeSubject, setActive] = useState<string | null>(
    transcriptCache?.groups[0]?.subject ?? null
  );
  const [cursorIdx, setCursorIdx]       = useState<number | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  // Reset the keyboard cursor + expanded row when the active subject changes.
  // Done during render (not in an effect) per the React "adjust state on prop
  // change" pattern — avoids an extra commit and the set-state-in-effect lint.
  const [prevSubject, setPrevSubject] = useState(activeSubject);
  if (activeSubject !== prevSubject) {
    setPrevSubject(activeSubject);
    setCursorIdx(null);
    setExpandedCode(null);
  }

  useEffect(() => {
    if (transcriptCache) return;
    fetch("/api/transcript")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(true); return; }
        const parsed = d as TranscriptData;
        transcriptCache = parsed;
        setData(parsed);
        if (parsed.groups.length > 0) setActive(parsed.groups[0].subject);
      })
      .catch(() => setError(true));
  }, []);

  const group: SubjectGroup | undefined = data?.groups.find(
    (g) => g.subject === activeSubject
  );

  useEffect(() => {
    if (!data) return;
    const courses = group?.courses ?? [];
    const handleKey = (e: KeyboardEvent) => {
      const tabPrev = e.key === "ArrowLeft"  || e.key === "a" || e.key === "A";
      const tabNext = e.key === "ArrowRight" || e.key === "d" || e.key === "D";
      if (tabPrev || tabNext) {
        e.preventDefault();
        const idx     = data.groups.findIndex((g) => g.subject === activeSubject);
        const nextIdx = tabPrev
          ? (idx - 1 + data.groups.length) % data.groups.length
          : (idx + 1) % data.groups.length;
        setActive(data.groups[nextIdx].subject);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        setCursorIdx((prev) => (prev === null ? 0 : Math.min(prev + 1, courses.length - 1)));
        return;
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        setCursorIdx((prev) => (prev === null ? courses.length - 1 : Math.max(prev - 1, 0)));
        return;
      }
      if ((e.key === "Enter" || e.key === " ") && cursorIdx !== null) {
        e.preventDefault();
        const code = courses[cursorIdx]?.code;
        if (code) setExpandedCode((prev) => (prev === code ? null : code));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [data, activeSubject, group, cursorIdx]);

  // Map COOP course code → matched experience exhibit title/subtitle
  const coopMatches = useMemo(() => {
    const result = new Map<string, { title: string; subtitle?: string }>();
    const coopGroup = data?.groups.find((g) => g.subject === "COOP");
    if (!coopGroup) return result;
    for (const course of coopGroup.courses) {
      if (!course.term) continue;
      for (const exhibit of experienceExhibits) {
        const date = exhibit.popup?.date;
        if (!date) continue;
        const startStr = date.split(/[–\-]/)[0].trim();
        if (termOverlapsDate(course.term, startStr)) {
          result.set(course.code, {
            title:    exhibit.popup?.title    ?? course.title,
            subtitle: exhibit.popup?.subtitle ?? undefined,
          });
          break;
        }
      }
    }
    return result;
  }, [data]);

  const isCoopTerm = data?.currentFormOfStudy?.toLowerCase().includes("co-op");
  const currentLabel = data?.currentTerm
    ? `${data.currentTerm} · ${isCoopTerm ? "Co-op" : data.currentLevel ?? "Study"}`
    : null;

  return (
    <>
      <motion.div
        key="transcript-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-20 bg-[rgba(28,21,8,0.72)] backdrop-blur-sm"
      />

      <div
        className="fixed top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "min(720px, 95vw)" }}
      >
        <motion.div
          key="transcript-popup"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full flex flex-col overflow-y-auto rounded-lg border-2 border-sage bg-parchment shadow-[0_8px_40px_rgba(28,21,8,0.35)] [scrollbar-width:thin] [scrollbar-color:#7a9e7e_transparent]"
          style={{ maxHeight: "min(580px, 80vh)" }}
        >
          {/* Header */}
          <div className="shrink-0 px-5 pt-4 pb-0 border-b border-[rgba(58,46,30,0.15)] bg-parchment">

            {/* Row 1: title + close */}
            <div className="flex justify-between items-center mb-3">
              <h2 className="m-0 font-mono text-[26px] text-pine tracking-[1px] leading-none">
                Education
              </h2>
              <button
                onClick={onClose}
                className="select-none bg-transparent border border-[rgba(58,46,30,0.25)] rounded text-walnut font-mono text-[13px] px-3 py-1 cursor-pointer transition-colors hover:bg-[rgba(58,46,30,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
              >
                close [`]
              </button>
            </div>

            {/* Row 2: boxed info card */}
            <div className="flex flex-col sm:flex-row sm:items-stretch rounded-lg border border-[rgba(58,46,30,0.13)] overflow-hidden">
              {/* Left: institution */}
              <div className="flex-1 px-4 py-3 flex flex-col justify-center">
                <p className="m-0 font-mono text-[18px] text-pine font-bold">
                  University of Waterloo
                </p>
                {data?.program && (
                  <p className="m-0 mt-1 font-mono text-[12px] text-walnut opacity-55">
                    {shortenProgram(data.program)}
                  </p>
                )}
              </div>

              {/* Right: dates */}
              {data && (
                <div className="border-t sm:border-t-0 sm:border-l border-[rgba(58,46,30,0.13)] px-4 py-3 flex flex-row sm:flex-col justify-between gap-2.5 shrink-0">
                  {data.startTerm && (
                    <div>
                      <span className="block font-mono text-[10px] text-walnut opacity-40 uppercase tracking-wide mb-0.5">
                        Enrolled
                      </span>
                      <span className="font-mono text-[13px] text-pine opacity-70">
                        {data.startTerm} – Spring 2029
                      </span>
                    </div>
                  )}
                  {currentLabel && (
                    <div>
                      <span className="block font-mono text-[10px] text-walnut opacity-40 uppercase tracking-wide mb-0.5">
                        Currently
                      </span>
                      <span className="font-mono text-[13px] text-sage font-bold">
                        {currentLabel}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Subject tabs + nav hint */}
            <div className="flex items-end justify-between gap-2 mt-4 border-b border-[rgba(58,46,30,0.15)]">
              <div className="flex gap-1 flex-wrap">
                {(data?.groups ?? []).map((g) => {
                  const active = g.subject === activeSubject;
                  return (
                    <button
                      key={g.subject}
                      onClick={() => setActive(g.subject)}
                      className={[
                        "font-mono text-[12px] px-3 py-1 cursor-pointer rounded-tl rounded-tr -mb-px border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 whitespace-nowrap",
                        active
                          ? "bg-[rgba(122,158,126,0.15)] border-[rgba(122,158,126,0.5)] border-b-parchment text-pine opacity-100"
                          : "bg-transparent border-transparent text-walnut opacity-60 hover:opacity-80",
                      ].join(" ")}
                    >
                      {g.subject}
                      <span className="ml-1 opacity-45 text-[10px]">{g.courses.length}</span>
                    </button>
                  );
                })}
              </div>
              <span className="hidden sm:block font-mono text-[11px] text-walnut opacity-40 pb-1 shrink-0">
                ← → a d · ↑ ↓ · enter
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 bg-parchment">
            {!data && !error && (
              <p className="font-mono text-[13px] text-walnut opacity-50">Scanning transcript...</p>
            )}
            {error && (
              <p className="font-mono text-[13px] text-[#c00]">Failed to load transcript data.</p>
            )}

            {data && group && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSubject}
                  initial={{ opacity: 0, y: 6  }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{    opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="mb-3">
                    <span className="font-mono text-[13px] text-pine font-bold">
                      {group.fullName}
                    </span>
                  </div>
                  <CourseTable
                    courses={group.courses}
                    coopMatches={coopMatches}
                    cursorIdx={cursorIdx}
                    expandedCode={expandedCode}
                    onToggle={(code) => setExpandedCode((prev) => (prev === code ? null : code))}
                    onSelect={(idx) => setCursorIdx(idx)}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {data && !group && (
              <p className="font-mono text-[13px] text-walnut opacity-50">No courses found.</p>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

function CourseTable({
  courses,
  coopMatches,
  cursorIdx,
  expandedCode,
  onToggle,
  onSelect,
}: {
  courses: CourseEntry[];
  coopMatches?: Map<string, { title: string; subtitle?: string }>;
  cursorIdx?: number | null;
  expandedCode?: string | null;
  onToggle?: (code: string) => void;
  onSelect?: (idx: number) => void;
}) {
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (cursorIdx != null) {
      rowRefs.current[cursorIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [cursorIdx]);

  return (
    <div className="flex flex-col">
      {courses.map((c, i) => {
        const match      = coopMatches?.get(c.code);
        const isCursor   = i === cursorIdx;
        const isExpanded = expandedCode === c.code;
        return (
          <div
            key={c.code}
            ref={(el) => { rowRefs.current[i] = el; }}
            onClick={() => { onSelect?.(i); if (c.description) onToggle?.(c.code); }}
            className={[
              "flex gap-3 py-2.5 font-mono rounded transition-colors",
              i < courses.length - 1 ? "border-b border-[rgba(58,46,30,0.08)]" : "",
              isCursor ? "bg-[rgba(122,158,126,0.1)]" : "",
              c.description ? "cursor-pointer" : "",
            ].join(" ")}
          >
            <span className="shrink-0 text-[12px] text-pine font-bold pt-px" style={{ width: "72px" }}>
              {c.code}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className="flex-1 text-[12px] text-walnut leading-normal truncate min-w-0"
                  title={match ? `${match.title}${match.subtitle ? ` · ${match.subtitle}` : ""}` : c.title}
                >
                  {match ? (
                    <>
                      <span className="text-pine font-bold">{match.title}</span>
                      {match.subtitle && (
                        <span className="opacity-60"> · {match.subtitle}</span>
                      )}
                    </>
                  ) : c.title}
                </span>
                {c.inProgress && (
                  <span className="shrink-0 font-mono text-[10px] text-[#8a7a3e] bg-[rgba(172,148,89,0.12)] border border-[rgba(172,148,89,0.35)] rounded px-1.5 py-0.5 italic">
                    current
                  </span>
                )}
                {c.description && (
                  <span className="shrink-0 text-[10px] text-walnut opacity-30 select-none">
                    {isExpanded ? "▾" : "▸"}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {isExpanded && c.description && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="m-0 mt-1.5 text-[11px] text-walnut opacity-55 leading-normal overflow-hidden"
                  >
                    {c.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
