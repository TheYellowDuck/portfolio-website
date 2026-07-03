// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import { NextResponse } from "next/server";
import resumeData from "@/data/resume.generated.json";
import type { ResumeCollection } from "@/types/resume";

// The résumé .tex sources are parsed at build time into resume.generated.json (see
// scripts/sync-docs.mts), so this route never runs pdf-parse / pdfjs-dist in the serverless runtime —
// where pdfjs crashes with "ReferenceError: DOMMatrix is not defined". It just serves the committed
// JSON: the default variant at the top level plus every variant under `variants` for the popup's
// tab switcher. Re-run `npm run sync:docs` (the daily Action also does) after editing a résumé.
export function GET() {
  return NextResponse.json(resumeData as ResumeCollection, {
    headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
