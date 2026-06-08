// Site-wide constants for metadata, OG, sitemap, robots, and structured data.
// Set NEXT_PUBLIC_SITE_URL to the real domain when deploying.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://georgezhang.dev";

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
