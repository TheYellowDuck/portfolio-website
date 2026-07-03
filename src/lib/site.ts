// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

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
  // One-line bio → the Person `description` in structured data; helps search + AI engines summarize
  // who you are. Mirrors the hero.
  bio: "CS student at the University of Waterloo building thoughtful software — from Android Automotive at Ford to computer-vision rehab tools and competitive programming.",
  alumniOf: "University of Waterloo",
  email: "gzhang06@outlook.com",
  location: { city: "Waterloo", region: "Ontario", country: "Canada" },
  // Topics you're known for — a direct topical-relevance signal for search + AI answer engines
  // (surfaced as JSON-LD `knowsAbout`). Keep these honest and grounded in the site's content.
  knowsAbout: [
    "Software Engineering",
    "Competitive Programming",
    "Algorithms and Data Structures",
    "Android Development",
    "Computer Vision",
    "Full-Stack Web Development",
  ],
  // Every profile that is "also me" — the strongest signal for search engines (and AI answer
  // engines) to consolidate these into one entity. Surfaced as JSON-LD `sameAs` + <link rel="me">.
  sameAs: [
    "https://github.com/TheYellowDuck",
    "https://linkedin.com/in/iamgeorgezhang/",
    "https://leetcode.com/u/georgezhang006/",
    "https://dmoj.ca/user/georgezhang006",
  ],
} as const;

// Named profile/contact URLs derived from PERSON (single source) — so the hero, the in-game card,
// and the gift shop never re-hardcode them.
export const LINKS = {
  github: PERSON.sameAs.find((u) => u.includes("github.com"))!,
  linkedin: PERSON.sameAs.find((u) => u.includes("linkedin.com"))!,
  leetcode: PERSON.sameAs.find((u) => u.includes("leetcode.com"))!,
  dmoj: PERSON.sameAs.find((u) => u.includes("dmoj.ca"))!,
  email: `mailto:${PERSON.email}`,
} as const;

export const SITE_TITLE = `${PERSON.name} — Portfolio`;
export const SITE_DESCRIPTION =
  "CS student at the University of Waterloo — projects, experience, and an explorable pixel-art museum.";
