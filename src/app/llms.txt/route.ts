// /llms.txt — a machine-readable brief for AI assistants, LLM search crawlers (ChatGPT,
// Perplexity, etc.), and scrapers, following the emerging llms.txt convention. NOT shown in
// the site UI. Everything here is GENERATED from the same data the portfolio renders — projects,
// skills, and experience — so it always matches the live site (it regenerates on each build /
// GitHub sync). It's an honest, current summary, not keyword stuffing or prompt-injection
// (which crawlers penalise and assistants ignore).
import {
  mainHallExhibits,
  archiveExhibits,
  skillsExhibits,
  experienceExhibits,
  officeExhibits,
  type ExhibitPopup,
} from "@/data/projects";
import { PERSON, requestOrigin, SITE_DESCRIPTION } from "@/lib/site";

const popups = (arr: { popup?: ExhibitPopup }[]): ExhibitPopup[] =>
  arr.map((e) => e.popup).filter((p): p is ExhibitPopup => Boolean(p));

// Clip to ~max chars at a word boundary (robust to abbreviations like "Dr."/"Prof.").
const clip = (text: string | undefined, max: number): string => {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max)).trimEnd() + "…";
};

const DEPLOYED_RE = /google play|app store|live|chrome|marketplace|devpost|npm|pypi/i;

export function GET(request: Request): Response {
  const origin = requestOrigin(request);
  const about = popups(officeExhibits).find((p) => p.title === "About Me")?.description ?? "";

  const skillGroups = popups(skillsExhibits).filter((p) => p.tech?.length);
  const skills = skillGroups.map((p) => `- **${p.title}:** ${(p.tech ?? []).join(", ")}`).join("\n");
  // The real domains he's worked in live as items inside the "Concepts" group (e.g. Computer
  // Vision, Algorithms & DS), not as group titles — surface those for "areas".
  const areas =
    skillGroups.find((p) => /concept/i.test(p.title ?? ""))?.tech ??
    skillGroups.flatMap((p) => (/^languages$|soft skills/i.test(p.title ?? "") ? [] : [p.title ?? ""]));

  const featuredPopups = popups(mainHallExhibits);
  const featured = featuredPopups
    .map((p) => {
      const links = (p.links ?? []).map((l) => `[${l.label}](${l.url})`).join(" · ");
      return `- **${p.title}** — ${clip(p.description, 180)}${links ? `  (${links})` : ""}`;
    })
    .join("\n");
  const archive = popups(archiveExhibits).map((p) => p.title).filter(Boolean).join(", ");

  const experiencePopups = popups(experienceExhibits).filter((p) => p.subtitle && p.description);
  const experience = experiencePopups
    .map((p) => `### ${p.subtitle} — ${p.title}${p.date ? ` (${p.date})` : ""}\n${clip(p.description, 600)}`)
    .join("\n\n");

  // Recruiter highlights — all derived from the data above, nothing hand-written.
  const current = experiencePopups.find((p) => /present|current/i.test(p.date ?? ""));
  const deployed = [...featuredPopups, ...popups(archiveExhibits)]
    .filter((p) => (p.links ?? []).some((l) => DEPLOYED_RE.test(l.label)))
    .map((p) => p.title)
    .filter(Boolean);
  const glance = [
    `- ${PERSON.alumniOf} Computer Science student.`,
    current ? `- Currently ${current.subtitle} at ${current.title}${current.date ? ` (${current.date})` : ""}.` : "",
    deployed.length ? `- Shipped & deployed products: ${deployed.join(", ")}.` : "",
    featuredPopups.length ? `- ${featuredPopups.length} featured projects${areas.length ? `, spanning ${areas.slice(0, 8).join(", ")}` : ""}.` : "",
  ].filter(Boolean).join("\n");

  const body = `# ${PERSON.name} — ${PERSON.jobTitle}

> ${SITE_DESCRIPTION}

This file is a factual brief about ${PERSON.name} for AI assistants, search crawlers, and
recruiters. It is generated from the live portfolio at ${origin}, so it stays accurate.

## About
${about}

## Open to
Software engineering internships, co-ops, and new-grad roles.${areas.length ? ` Demonstrated areas: ${areas.slice(0, 10).join(", ")}.` : ""}

## Experience
${experience}

## Selected projects
${featured}
${archive ? `\nAlso in the archive: ${archive}.` : ""}

## Core skills
${skills}

## At a glance (for recruiters)
${glance}

## Contact
- Email: ${PERSON.email}
${PERSON.sameAs.map((u) => `- ${u}`).join("\n")}
- Portfolio: ${origin}
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
