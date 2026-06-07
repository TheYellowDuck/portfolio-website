import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import type {
  CourseEntry,
  SubjectGroup,
  TranscriptData,
} from "@/types/transcript";

export const dynamic = "force-dynamic";

const SUBJECT_NAMES: Record<string, string> = {
  AFM:    "Accounting & Financial Mgmt.",
  CO:     "Combinatorics & Optimization",
  COMMST: "Communication Studies",
  COOP:   "Co-operative Education",
  CS:     "Computer Science",
  ECON:   "Economics",
  ENGL:   "English",
  MATH:   "Mathematics",
  PD:     "Professional Development",
  PHYS:   "Physics",
  PSYCH:  "Psychology",
  STAT:   "Statistics",
};

const COURSE_START_RE   = /^([A-Z]{2,6})\s+(\d{1,4}[A-Z]?)\s+(.*)/;
const TERM_HEADER_RE    = /^(Fall|Winter|Spring|Summer)\s+(\d{4})$/;
const LEVEL_RE          = /^Level:\s+(\w+)\s+Form Of Study:\s+(.+)/;
const PROGRAM_RE        = /^Program:\s+(.+)/;

const TRAIL_WITH_GRADE_RE =
  /\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(?:\d{1,3}|CR|NCR|DNW|WD|WF)\s*$/;
const TRAIL_NO_GRADE_RE   = /\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s*$/;
const STANDALONE_TRAIL_RE =
  /^(\d+\.\d{2})\s+(\d+\.\d{2})(?:\s+(?:\d{1,3}|CR|NCR|DNW|WD|WF))?\s*$/;

interface Pending {
  subject: string;
  number: string;
  titleParts: string[];
  earned?: number;
  term?: string;
}

function subjectFullName(s: string): string {
  return SUBJECT_NAMES[s] ?? s;
}

function parseTranscript(rawText: string): Omit<TranscriptData, "pdfPath"> {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const courses: CourseEntry[] = [];
  let pending: Pending | null = null;

  let program: string | undefined;
  let startTerm: string | undefined;
  let currentTerm: string | undefined;
  let currentLevel: string | undefined;
  let currentFormOfStudy: string | undefined;

  let currentParserTerm: string | undefined;

  function flush() {
    if (!pending) return;
    const title = pending.titleParts.join(" ").trim();
    if (title.length > 1) {
      courses.push({
        code: `${pending.subject} ${pending.number}`,
        title,
        credits: pending.earned,
        inProgress: pending.earned === undefined,
        term: pending.term,
      });
    }
    pending = null;
  }

  for (const line of lines) {
    // Term header
    const termMatch = line.match(TERM_HEADER_RE);
    if (termMatch) {
      const term = `${termMatch[1]} ${termMatch[2]}`;
      if (!startTerm) startTerm = term;
      currentTerm = term;
      currentParserTerm = term;
      continue;
    }

    // Program
    const programMatch = line.match(PROGRAM_RE);
    if (programMatch) {
      if (!program) program = programMatch[1];
      continue;
    }

    // Level + form of study
    const levelMatch = line.match(LEVEL_RE);
    if (levelMatch) {
      currentLevel         = levelMatch[1];
      currentFormOfStudy   = levelMatch[2].trim();
      continue;
    }

    // Course start
    const courseMatch = line.match(COURSE_START_RE);
    if (courseMatch) {
      flush();
      const [, subject, number, rest] = courseMatch;

      const withGrade = rest.match(TRAIL_WITH_GRADE_RE);
      if (withGrade) {
        const title = rest.slice(0, rest.length - withGrade[0].length).trim();
        if (title.length > 1) {
          courses.push({ code: `${subject} ${number}`, title, credits: parseFloat(withGrade[2]), term: currentParserTerm });
        }
        continue;
      }
      const noGrade = rest.match(TRAIL_NO_GRADE_RE);
      if (noGrade) {
        const title = rest.slice(0, rest.length - noGrade[0].length).trim();
        if (title.length > 1) {
          courses.push({ code: `${subject} ${number}`, title, credits: parseFloat(noGrade[2]), term: currentParserTerm });
        }
        continue;
      }

      pending = { subject, number, titleParts: rest ? [rest] : [], term: currentParserTerm };
      continue;
    }

    if (pending) {
      const trailMatch = line.match(STANDALONE_TRAIL_RE);
      if (trailMatch) {
        const m = line.match(/(\d+\.\d{2})\s+(\d+\.\d{2})/);
        if (m) pending.earned = parseFloat(m[2]);
        flush();
        continue;
      }
      pending.titleParts.push(line);
    }
  }

  flush();

  // Deduplicate by code (keep last)
  const seen = new Map<string, CourseEntry>();
  for (const c of courses) seen.set(c.code, c);

  const subjectMap = new Map<string, CourseEntry[]>();
  for (const c of seen.values()) {
    const subj = c.code.split(" ")[0];
    if (!subjectMap.has(subj)) subjectMap.set(subj, []);
    subjectMap.get(subj)!.push(c);
  }

  const TAB_PRIORITY = ["COOP", "CS", "ECE", "MATH", "STAT", "CO"];

  const groups: SubjectGroup[] = Array.from(subjectMap.entries())
    .sort(([a], [b]) => {
      const pa = TAB_PRIORITY.indexOf(a);
      const pb = TAB_PRIORITY.indexOf(b);
      if (pa !== -1 || pb !== -1) {
        if (pa === -1) return 1;
        if (pb === -1) return -1;
        return pa - pb;
      }
      return a.localeCompare(b);
    })
    .map(([subject, cs]) => ({
      subject,
      fullName: subjectFullName(subject),
      courses: cs.sort((a, b) => a.code.localeCompare(b.code)),
    }));

  return { program, startTerm, currentTerm, currentLevel, currentFormOfStudy, groups };
}

async function fetchCourseDescriptions(subjects: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    subjects.map(async (subject) => {
      try {
        const prefix = subject.toLowerCase();
        const res = await fetch("https://uwflow.com/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `{ course(where: {code: {_like: "${prefix}%"}}) { code description } }`,
          }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          data?: { course: Array<{ code: string; description?: string }> };
        };
        for (const c of json.data?.course ?? []) {
          const num = c.code.slice(prefix.length);
          // Skip if what follows the prefix isn't a digit (avoids CO matching COOP/COMMST)
          if (!num || !/^\d/.test(num)) continue;
          if (c.description) map.set(`${subject} ${num.toUpperCase()}`, c.description);
        }
      } catch { /* ignore per-subject failures */ }
    })
  );
  return map;
}

export async function GET() {
  try {
    const dir      = path.join(process.cwd(), "public/assets/transcript");
    const fileName = readdirSync(dir).find((f) => f.toLowerCase().endsWith(".pdf"));
    if (!fileName) return NextResponse.json({ error: "No transcript PDF found" }, { status: 404 });

    const buf    = readFileSync(path.join(dir, fileName));
    const parser = new PDFParse({ data: new Uint8Array(buf), verbosity: 0 });
    const result = await parser.getText();
    const parsed = parseTranscript(result.text);

    const subjects = parsed.groups.map((g) => g.subject).filter((s) => s !== "COOP");
    const descMap  = await fetchCourseDescriptions(subjects);
    for (const group of parsed.groups) {
      for (const course of group.courses) {
        const desc = descMap.get(course.code);
        if (desc) course.description = desc;
      }
    }

    return NextResponse.json({
      ...parsed,
      pdfPath: `/assets/transcript/${fileName}`,
    } satisfies TranscriptData);
  } catch (err) {
    console.error("Transcript parse error:", err);
    return NextResponse.json({ error: "Failed to parse transcript" }, { status: 500 });
  }
}
