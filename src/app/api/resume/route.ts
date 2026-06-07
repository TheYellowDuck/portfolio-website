import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import type {
  ContactInfo,
  ResumeEntry,
  ResumeSection,
  ResumeData,
} from "@/types/resume";

export const dynamic = "force-dynamic";

const SECTION_HEADERS = [
  "SKILLS",
  "EDUCATION",
  "WORK EXPERIENCE",
  "PROJECTS",
  "AWARDS AND ACHIEVEMENTS",
];

// A right-side date range like "Jun 2025 – Aug 2025" or "Sep 2024 – May 2029"
const DATE_RANGE_RE = /^(?:\w{3,4}\.?\s+)?\d{4}\s*[–\-]\s*(?:\w{3,4}\.?\s+)?\d{4}$/;
// A year-only stamp like "Oct 2024"
const YEAR_STAMP_RE = /\w{3,4}\.?\s+\d{4}$/;

function splitTabLine(line: string): { left: string; right: string } | null {
  const tabIdx = line.indexOf("\t");
  if (tabIdx !== -1) return { left: line.slice(0, tabIdx).trim(), right: line.slice(tabIdx + 1).trim() };
  // Fall back to 3+ spaces
  const m = line.match(/^(.+?)\s{3,}(.+)$/);
  if (m) return { left: m[1].trim(), right: m[2].trim() };
  return null;
}

function parseContact(line: string): ContactInfo {
  const parts = line.split("|").map((p) => p.trim());
  return {
    phone:    parts.find((p) => /^[\d\s\(\)\-\+]{7,}$/.test(p)),
    email:    parts.find((p) => p.includes("@")),
    linkedin: parts.find((p) => p.toLowerCase().includes("linkedin")),
    github:   parts.find((p) => p.toLowerCase().includes("github")),
  };
}

function parseEntriesSection(lines: string[]): ResumeEntry[] {
  const entries: ResumeEntry[] = [];
  let current: ResumeEntry | null = null;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Bullet line
    if (trimmed.startsWith("•")) {
      // Strip a trailing year stamp (awards bullets have "… \t Oct 2024")
      const parts = splitTabLine(raw);
      let bullet = trimmed.slice(1).trim();
      if (parts && YEAR_STAMP_RE.test(parts.right)) {
        bullet = parts.left.slice(1).trim(); // strip leading "•"
      }
      if (current) current.bullets.push(bullet);
      continue;
    }

    const split = splitTabLine(raw);
    if (split) {
      if (DATE_RANGE_RE.test(split.right)) {
        // New entry header: "Title [| Tech | ...]  TAB  Period"
        if (current) entries.push(current);
        const left = split.left;
        const pipeIdx = left.indexOf("|");
        let title: string;
        let tech: string[] | undefined;
        if (pipeIdx !== -1) {
          title = left.slice(0, pipeIdx).trim();
          tech = left.slice(pipeIdx + 1).split("|").map((t) => t.trim()).filter(Boolean);
        } else {
          title = left;
        }
        current = { title, tech, period: split.right, bullets: [] };
        continue;
      }

      // Subtitle/location line — right is NOT a date range
      if (current && !current.subtitle) {
        current.subtitle = split.left;
        current.location = split.right;
        continue;
      }
    }

    // Continuation of previous bullet (long bullets wrap to next line)
    if (current && current.bullets.length > 0) {
      current.bullets[current.bullets.length - 1] += " " + trimmed;
    }
  }

  if (current) entries.push(current);
  return entries;
}

// Strip PDF page markers like "-- 1 of 1 --" from bullet text
const PAGE_MARKER_RE = /\s*--\s*\d+\s+of\s+\d+\s*--\s*$/;

function parseBulletSection(lines: string[]): string[] {
  const bullets: string[] = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("•")) {
      const split = splitTabLine(raw);
      let text: string;
      if (split && YEAR_STAMP_RE.test(split.right)) {
        text = split.left.slice(1).trim();
      } else {
        text = trimmed.slice(1).trim();
      }
      bullets.push(text.replace(PAGE_MARKER_RE, ""));
    } else if (bullets.length > 0) {
      const cleaned = trimmed.replace(PAGE_MARKER_RE, "");
      if (cleaned) bullets[bullets.length - 1] += " " + cleaned;
    }
  }
  return bullets;
}

function parseText(rawText: string): Pick<ResumeData, "name" | "contact" | "sections"> {
  // Keep original lines so tabs survive
  const rawLines = rawText.split("\n");
  const trimLines = rawLines.map((l) => l.trim());

  // First two non-empty lines = name + contact
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

  // Gather sections (use original rawLines to preserve tabs)
  const rawSections: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;

  for (let i = startIdx; i < rawLines.length; i++) {
    const trimmed = trimLines[i];
    if (!trimmed) continue;
    const header = SECTION_HEADERS.find((h) => trimmed === h);
    if (header) {
      if (current) rawSections.push(current);
      current = { title: header, lines: [] };
    } else if (current) {
      current.lines.push(rawLines[i]); // original line, tabs intact
    }
  }
  if (current) rawSections.push(current);

  const sections: ResumeSection[] = rawSections.map(({ title, lines }) => {
    if (title === "SKILLS" || title === "AWARDS AND ACHIEVEMENTS") {
      return { title, bullets: parseBulletSection(lines) };
    }
    return { title, entries: parseEntriesSection(lines) };
  });

  return { name, contact, sections };
}

export async function GET() {
  try {
    const dir      = path.join(process.cwd(), "public/assets/resume");
    const fileName = readdirSync(dir).find((f) => f.toLowerCase().endsWith(".pdf"));
    if (!fileName) return NextResponse.json({ error: "No resume PDF found" }, { status: 404 });

    const buf    = readFileSync(path.join(dir, fileName));
    const parser = new PDFParse({ data: new Uint8Array(buf), verbosity: 0 });
    const result = await parser.getText();
    const parsed = parseText(result.text);

    return NextResponse.json({
      ...parsed,
      pdfPath: `/assets/resume/${fileName}`,
    } satisfies ResumeData);
  } catch (err) {
    console.error("Resume parse error:", err);
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}
