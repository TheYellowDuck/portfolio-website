// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import { NextRequest, NextResponse } from "next/server";

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  return Buffer.from(base64 + "=".repeat(padding), "base64").toString("utf-8");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;

  let jarUrl: string;
  try {
    jarUrl = fromBase64Url(slug[0]);
  } catch {
    return NextResponse.json({ error: "Invalid encoding" }, { status: 400 });
  }

  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\//.test(jarUrl)) {
    return NextResponse.json({ error: "Only GitHub release URLs allowed" }, { status: 403 });
  }

  const fetchHeaders: Record<string, string> = { "User-Agent": "museum-portfolio/1.0" };
  const rangeHeader = req.headers.get("range");
  if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

  let upstream: Response;
  try {
    upstream = await fetch(jarUrl, { headers: fetchHeaders });
  } catch {
    return NextResponse.json({ error: "Failed to fetch JAR" }, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: "Upstream error" }, { status: upstream.status });
  }

  const buffer = await upstream.arrayBuffer();

  const responseHeaders: Record<string, string> = {
    "Content-Type": "application/java-archive",
    "Cache-Control": "public, max-age=86400",
    "Accept-Ranges": "bytes",
  };

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) responseHeaders["Content-Range"] = contentRange;

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) responseHeaders["Content-Length"] = contentLength;

  return new NextResponse(buffer, {
    status: upstream.status === 206 ? 206 : 200,
    headers: responseHeaders,
  });
}
