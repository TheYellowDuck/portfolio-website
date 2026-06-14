import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Résumé/transcript PDFs are parsed at build time (scripts/sync-docs.mts → *.generated.json), so
  // no runtime pdf-parse/pdfjs and no need to trace the PDFs into the serverless functions.
  transpilePackages: ["howler"],
  // Let phones/tablets on the local network — and 127.0.0.1 (a different origin
  // from localhost, handy for dodging Safari's localhost favicon cache) — load dev
  // resources. Next 16 blocks cross-origin /_next/* requests by default, which
  // otherwise prevents the app JS from running (no OS detection, game, or reveals)
  // when you open a non-localhost URL. Dev-only — production serves everything
  // same-origin, so this has no effect there.
  allowedDevOrigins: ["127.0.0.1", "10.*.*.*", "172.16.*.*", "192.168.*.*"],
};

export default nextConfig;
