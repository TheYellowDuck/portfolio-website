// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import { NextResponse } from "next/server";
import transcriptData from "@/data/transcript.generated.json";
import type { TranscriptData } from "@/types/transcript";

// Parsed at build time into transcript.generated.json (see scripts/sync-docs.mts) so pdf-parse /
// pdfjs-dist never run in the serverless runtime (where pdfjs crashes: "DOMMatrix is not defined").
// Course descriptions (UWFlow) are baked in at sync time. This route just serves the committed JSON.
export function GET() {
  return NextResponse.json(transcriptData as TranscriptData, {
    headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
