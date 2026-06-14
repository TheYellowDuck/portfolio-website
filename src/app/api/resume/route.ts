import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import type { ResumeData } from "@/types/resume";
import { parseResumeText } from "@/lib/resume-parser";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // pdf-parse (which pulls in pdfjs-dist) is imported dynamically inside the try so a load-time
    // failure on the serverless runtime is caught here and returned as JSON, rather than throwing
    // at module load and crashing the whole function with a generic 500 page.
    const { PDFParse } = await import("pdf-parse");
    const dir      = path.join(process.cwd(), "public/assets/resume");
    const fileName = readdirSync(dir).find((f) => f.toLowerCase().endsWith(".pdf"));
    if (!fileName) return NextResponse.json({ error: "No resume PDF found" }, { status: 404 });

    const buf    = readFileSync(path.join(dir, fileName));
    const parser = new PDFParse({ data: new Uint8Array(buf), verbosity: 0 });
    const result = await parser.getText();
    const parsed = parseResumeText(result.text);

    return NextResponse.json({
      ...parsed,
      pdfPath: `/assets/resume/${fileName}`,
    } satisfies ResumeData);
  } catch (err) {
    console.error("Resume parse error:", err);
    const debug = new URL(request.url).searchParams.has("debug");
    return NextResponse.json(
      { error: "Failed to parse resume", ...(debug ? { detail: err instanceof Error ? `${err.name}: ${err.message}` : String(err) } : {}) },
      { status: 500 },
    );
  }
}
