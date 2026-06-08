import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  transpilePackages: ["howler"],
  // Let phones/tablets on the local network load dev resources. Next 16 blocks
  // cross-origin /_next/* requests by default, which otherwise prevents the app
  // JS from running when you open the LAN URL on a device. Dev-only — production
  // serves everything same-origin, so this has no effect there.
  allowedDevOrigins: ["10.*.*.*", "172.16.*.*", "192.168.*.*"],
};

export default nextConfig;
