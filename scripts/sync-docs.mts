// Build-time parse of the résumé + transcript PDFs into committed JSON.
//
// Why: pdf-parse pulls in pdfjs-dist, which references the browser `DOMMatrix` API. Vercel's Node
// serverless runtime doesn't provide it, so importing pdf-parse inside an /api route crashed at
// module load ("ReferenceError: DOMMatrix is not defined") and the routes 500'd on deploy (they
// worked locally only because local `next dev` never hit that code path). pdf-parse runs fine in a
// full Node environment — local or the GitHub Action — so we parse here, commit the JSON, and let
// the routes serve it statically. No pdfjs in the serverless function = nothing to crash.
//
// Run with `npm run sync:docs` whenever a PDF changes; the daily sync Action runs it too. Reuses the
// exact parsers the routes used, so the output is identical to the old runtime behaviour.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { parseResumeText } from "../src/lib/resume-parser.ts";
import { parseTranscript } from "../src/lib/transcript-parser.ts";
import type { ResumeData } from "../src/types/resume.ts";
import type { TranscriptData } from "../src/types/transcript.ts";

const ROOT = process.cwd();

const firstPdf = (dir: string): string | null =>
  readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf")).sort()[0] ?? null;

async function pdfText(file: string): Promise<string> {
  const buf = readFileSync(file);
  const parser = new PDFParse({ data: new Uint8Array(buf), verbosity: 0 });
  return (await parser.getText()).text;
}

function writeJson(rel: string, data: unknown): void {
  writeFileSync(path.join(ROOT, rel), JSON.stringify(data, null, 2) + "\n");
}

// Ported verbatim from the transcript route — best-effort UWFlow course descriptions per subject.
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
          if (!num || !/^\d/.test(num)) continue;
          if (c.description) map.set(`${subject} ${num.toUpperCase()}`, c.description);
        }
      } catch {
        /* ignore per-subject failures */
      }
    }),
  );
  return map;
}

async function syncResume(): Promise<void> {
  const dir = path.join(ROOT, "public/assets/resume");
  const file = firstPdf(dir);
  if (!file) {
    console.warn("sync-docs: no résumé PDF found — skipping");
    return;
  }
  const text = await pdfText(path.join(dir, file));
  const data: ResumeData = { ...parseResumeText(text), pdfPath: `/assets/resume/${file}` };
  writeJson("src/data/resume.generated.json", data);
  console.log(`sync-docs: résumé → ${data.sections.length} sections from "${file}"`);
}

async function syncTranscript(): Promise<void> {
  const dir = path.join(ROOT, "public/assets/transcript");
  const file = firstPdf(dir);
  if (!file) {
    console.warn("sync-docs: no transcript PDF found — skipping");
    return;
  }
  const text = await pdfText(path.join(dir, file));
  const parsed = parseTranscript(text);

  const subjects = parsed.groups.map((g) => g.subject).filter((s) => s !== "COOP");
  const descMap = await fetchCourseDescriptions(subjects);
  for (const group of parsed.groups) {
    for (const course of group.courses) {
      const desc = descMap.get(course.code);
      if (desc) course.description = desc;
    }
  }

  const data: TranscriptData = { ...parsed, pdfPath: `/assets/transcript/${file}` };
  writeJson("src/data/transcript.generated.json", data);
  console.log(`sync-docs: transcript → ${parsed.groups.length} subject groups from "${file}"`);
}

await syncResume();
await syncTranscript();
