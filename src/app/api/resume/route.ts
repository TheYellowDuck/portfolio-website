import { NextResponse } from "next/server";
import resumeData from "@/data/resume.generated.json";
import type { ResumeData } from "@/types/resume";

// The résumé PDF is parsed at build time into resume.generated.json (see scripts/sync-docs.mts), so
// this route never runs pdf-parse / pdfjs-dist in the serverless runtime — where pdfjs crashes with
// "ReferenceError: DOMMatrix is not defined". It just serves the committed JSON. Re-run
// `npm run sync:docs` (the daily Action also does) after swapping the PDF.
export function GET() {
  return NextResponse.json(resumeData as ResumeData, {
    headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
