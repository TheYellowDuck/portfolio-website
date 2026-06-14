import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  transpilePackages: ["howler"],
  // The /api/resume and /api/transcript handlers read their PDF from public/ at runtime via fs, on
  // a path built at runtime (process.cwd() + readdirSync). Next's output file tracing can't see that
  // statically, so on Vercel the PDFs are left out of the serverless function bundle — the routes
  // work locally but 500 with ENOENT on deploy. Force the PDFs into each function's file trace.
  outputFileTracingIncludes: {
    "/api/resume": ["./public/assets/resume/**/*"],
    "/api/transcript": ["./public/assets/transcript/**/*"],
  },
  // Let phones/tablets on the local network — and 127.0.0.1 (a different origin
  // from localhost, handy for dodging Safari's localhost favicon cache) — load dev
  // resources. Next 16 blocks cross-origin /_next/* requests by default, which
  // otherwise prevents the app JS from running (no OS detection, game, or reveals)
  // when you open a non-localhost URL. Dev-only — production serves everything
  // same-origin, so this has no effect there.
  allowedDevOrigins: ["127.0.0.1", "10.*.*.*", "172.16.*.*", "192.168.*.*"],
};

export default nextConfig;
