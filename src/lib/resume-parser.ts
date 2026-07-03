// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

// Hardened résumé-text parser (path "B"): turns the plain text pdf-parse extracts from a résumé PDF
// into structured ResumeData. Handles BOTH layouts:
//   • the original V8 export — tab/wide-space separated columns, UPPERCASE section headers; and
//   • the current LaTeX export — single-spaced columns (no tabs), mixed-case/reworded headers,
//     "Present" date ranges, and project lines whose right column is a URL instead of a date.
// The primary pipeline parses the .tex sources directly (see resume-tex.ts); this is the resilient
// fallback for when only a PDF is available.

import type { ContactInfo, ResumeEntry, ResumeSection, ResumeData } from "@/types/resume";

// Section headers → canonical title. Accepts both the V8 wording and the new wording, any case.
const HEADER_ALIASES: Array<[RegExp, string]> = [
  [/^education$/i, "EDUCATION"],
  [/^(?:work\s+|professional\s+)?experience$/i, "WORK EXPERIENCE"],
  [/^(?:relevant\s+|selected\s+)?projects$/i, "PROJECTS"],
  [/^(?:technical\s+|core\s+)?skills$/i, "SKILLS"],
  [/^(?:awards?|honou?rs?)\b/i, "AWARDS AND ACHIEVEMENTS"],
];

function canonicalHeader(line: string): string | null {
  if (line.startsWith("•") || /[.!?]$/.test(line) || line.split(/\s+/).length > 6) return null;
  for (const [re, canon] of HEADER_ALIASES) if (re.test(line)) return canon;
  return null;
}

// Right-hand column tokens we can recognise without a tab: date ranges, "City, PROV", and URLs.
const DATE_RANGE_RE = /^(?:\w{3,4}\.?\s+)?\d{4}\s*[–—-]\s*(?:(?:\w{3,4}\.?\s+)?\d{4}|present|current)$/i;
const LOCATION_RE = /^[A-Z][A-Za-z.]+(?:[\s-][A-Za-z.]+)*,\s+[A-Z]{2}$/;
const URL_RE = /^(?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:\/\S*)?$/i;
// A year-only stamp like "Oct 2024" (V8 awards: "… \t Oct 2024")
const YEAR_STAMP_RE = /\w{3,4}\.?\s+\d{4}$/;
// Strip PDF page markers like "-- 1 of 1 --"
const PAGE_MARKER_RE = /\s*--\s*\d+\s+of\s+\d+\s*--\s*$/;

const isDate = (s: string) => DATE_RANGE_RE.test(s);
const isUrl = (s: string) => URL_RE.test(s) && !LOCATION_RE.test(s);

// Peel a recognisable right-hand token (date / location / url) off the end of a separator-less line.
function peelRight(line: string): { left: string; right: string } | null {
  const patterns = [
    // date — month tokens required so greedy left can't swallow the leading month
    /^(.*\S)\s+(\w{3,4}\.?\s+\d{4}\s*[–—-]\s*(?:\w{3,4}\.?\s+\d{4}|Present|Current))$/i,
    /^(.*\S)\s+([A-Z][A-Za-z.]+(?:[\s-][A-Za-z.]+)*,\s+[A-Z]{2})$/, // City, PROV
    /^(.*\S)\s+((?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:\/\S*)?)$/i,   // URL
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m) return { left: m[1].trim(), right: m[2].trim() };
  }
  return null;
}

function splitColumns(line: string): { left: string; right: string } | null {
  const tabIdx = line.indexOf("\t");
  if (tabIdx !== -1) return { left: line.slice(0, tabIdx).trim(), right: line.slice(tabIdx + 1).trim() };
  const wide = line.match(/^(.+?)\s{3,}(.+)$/);
  if (wide) return { left: wide[1].trim(), right: wide[2].trim() };
  return peelRight(line.trim());
}

function parseContact(line: string): ContactInfo {
  const parts = line.split("|").map((p) => p.trim());
  const gh = parts.find((p) => /github/i.test(p));
  return {
    phone:    parts.find((p) => /^[\d\s()\-+]{7,}$/.test(p)),
    email:    parts.find((p) => p.includes("@")),
    linkedin: parts.find((p) => /linkedin/i.test(p)),
    github:   gh ? (/^https?:\/\//i.test(gh) ? gh : `https://${gh}`) : undefined,
  };
}

// Split "Title | tech | tech" or "Name | a, b, c" into a title and a tech list.
function splitTitleTech(left: string): { title: string; tech?: string[] } {
  const parts = left.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { title: left.trim() };
  const rest = parts.slice(1);
  const tech = rest.length === 1 && rest[0].includes(",") ? rest[0].split(/\s*,\s*/).filter(Boolean) : rest;
  return { title: parts[0], tech };
}

// Build a ResumeEntry from 1–2 collected header lines + bullets, working for both column orders
// (V8: role/date then org/location · new: org/location then role/date).
function finalizeEntry(headers: Array<{ left: string; right: string }>, bullets: string[]): ResumeEntry {
  const rights = headers.map((h) => h.right);
  const dateIdx = rights.findIndex(isDate);
  const period = dateIdx >= 0 ? rights[dateIdx] : undefined;
  const urlIdx = rights.findIndex((r, i) => i !== dateIdx && isUrl(r));
  const link = urlIdx >= 0 ? rights[urlIdx] : undefined;
  const location = rights.find((r, i) => i !== dateIdx && i !== urlIdx);
  const { title, tech } = splitTitleTech(headers[0].left);
  const subtitle = headers.length > 1 ? headers[1].left : undefined;
  return { title, tech, subtitle, period, location, link, bullets };
}

function parseEntriesSection(lines: string[]): ResumeEntry[] {
  const entries: ResumeEntry[] = [];
  let headers: Array<{ left: string; right: string }> = [];
  let bullets: string[] = [];

  const flush = () => {
    if (headers.length) entries.push(finalizeEntry(headers, bullets));
    headers = [];
    bullets = [];
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("•")) {
      const split = splitColumns(raw);
      const bullet = split && YEAR_STAMP_RE.test(split.right)
        ? split.left.replace(/^•\s*/, "")
        : trimmed.slice(1).trim();
      bullets.push(bullet.replace(PAGE_MARKER_RE, ""));
      continue;
    }

    const split = splitColumns(raw);
    if (split) {
      const lastRightIsUrl = headers.length === 1 && isUrl(headers[headers.length - 1].right);
      const startNew = headers.length === 0 || bullets.length > 0 || headers.length >= 2 || lastRightIsUrl;
      if (startNew) flush();
      headers.push(split);
      continue;
    }

    // Wrapped bullet continuation.
    if (bullets.length > 0) {
      const cleaned = trimmed.replace(PAGE_MARKER_RE, "");
      if (cleaned) bullets[bullets.length - 1] += " " + cleaned;
    }
  }
  flush();
  return entries;
}

function parseBulletSection(lines: string[]): string[] {
  const hasMarkers = lines.some((l) => l.trim().startsWith("•"));
  const bullets: string[] = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("•")) {
      const split = splitColumns(raw);
      const text = split && YEAR_STAMP_RE.test(split.right) ? split.left.slice(1).trim() : trimmed.slice(1).trim();
      bullets.push(text.replace(PAGE_MARKER_RE, ""));
    } else if (!hasMarkers) {
      // New-format skills: no bullet markers — each line is its own row ("Languages C++, …").
      const cleaned = trimmed.replace(PAGE_MARKER_RE, "");
      if (cleaned) bullets.push(cleaned);
    } else if (bullets.length > 0) {
      const cleaned = trimmed.replace(PAGE_MARKER_RE, "");
      if (cleaned) bullets[bullets.length - 1] += " " + cleaned;
    }
  }
  return bullets;
}

export function parseResumeText(rawText: string): Pick<ResumeData, "name" | "contact" | "sections"> {
  const rawLines = rawText.split("\n");
  const trimLines = rawLines.map((l) => l.trim());

  // First two non-empty lines = name + contact.
  let nonEmptyCount = 0;
  let startIdx = 0;
  let name = "";
  let contactStr = "";
  for (let i = 0; i < trimLines.length; i++) {
    if (!trimLines[i]) continue;
    nonEmptyCount++;
    if (nonEmptyCount === 1) name = trimLines[i];
    else if (nonEmptyCount === 2) { contactStr = trimLines[i]; startIdx = i + 1; break; }
  }
  const contact = parseContact(contactStr);

  // Gather sections (use original rawLines so any tabs survive).
  const rawSections: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;
  for (let i = startIdx; i < rawLines.length; i++) {
    const trimmed = trimLines[i];
    if (!trimmed) continue;
    const header = canonicalHeader(trimmed);
    if (header) {
      if (current) rawSections.push(current);
      current = { title: header, lines: [] };
    } else if (current) {
      current.lines.push(rawLines[i]);
    }
  }
  if (current) rawSections.push(current);

  const sections: ResumeSection[] = rawSections.map(({ title, lines }) =>
    title === "SKILLS" || title === "AWARDS AND ACHIEVEMENTS"
      ? { title, bullets: parseBulletSection(lines) }
      : { title, entries: parseEntriesSection(lines) },
  );

  return { name, contact, sections };
}
