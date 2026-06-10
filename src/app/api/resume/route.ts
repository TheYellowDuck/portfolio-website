import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import type { ResumeData } from "@/types/resume";
import { parseResumeText } from "@/lib/resume-parser";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}
