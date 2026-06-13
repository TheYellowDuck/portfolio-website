// Site-wide canonical URL for metadata, OG, sitemap, robots, and structured data. Auto-detected
// so it "just works" on deploy with no config. Precedence:
//   1. NEXT_PUBLIC_SITE_URL          — explicit override; pin an exact domain on any host.
//   2. VERCEL_PROJECT_PRODUCTION_URL — your Vercel production domain. Always set by Vercel (even on
//      previews); becomes your custom domain automatically once you add one, else the *.vercel.app.
//   3. VERCEL_URL                    — the per-deployment URL (fallback for non-production deploys).
//   4. http://localhost:3000         — local dev fallback (never a domain you don't own).
// Deploying somewhere other than Vercel? Set NEXT_PUBLIC_SITE_URL to your domain.
const httpsUrl = (host?: string): string | undefined =>
  host ? `https://${host.replace(/^https?:\/\//, "")}` : undefined;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  httpsUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  httpsUrl(process.env.VERCEL_URL) ??
  "http://localhost:3000";

/**
 * The origin the request is actually served from — dev: `http://localhost:3000`, prod: your real
 * host. Use this (instead of SITE_URL) inside served route handlers so generated text reflects
 * wherever it's actually hosted, with zero config, even before you've picked a domain. Honours
 * the proxy headers set by Vercel/etc.; falls back to SITE_URL only if there's no host header.
 */
export function requestOrigin(request: Request): string {
  const h = request.headers;
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  if (!host) return SITE_URL;
  const proto =
    (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() ||
    (/^(localhost|127\.|0\.0\.0\.0|\[)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export const PERSON = {
  name: "George Zhang",
  jobTitle: "Software Engineer · CS Student",
  alumniOf: "University of Waterloo",
  email: "gzhang06@outlook.com",
  sameAs: [
    "https://github.com/TheYellowDuck",
    "https://linkedin.com/in/iamgeorgezhang/",
  ],
} as const;

export const SITE_TITLE = "George Zhang — Portfolio";
export const SITE_DESCRIPTION =
  "CS student at the University of Waterloo — projects, experience, and an explorable pixel-art museum.";
