import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import type { TranscriptData } from "@/types/transcript";
import { parseTranscript } from "@/lib/transcript-parser";

export const dynamic = "force-dynamic";

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
