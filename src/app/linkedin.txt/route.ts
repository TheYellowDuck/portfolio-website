// /linkedin.txt — a copy-paste "update pack" for keeping the LinkedIn profile in sync with this
// site. The website (src/data/projects.ts, GitHub-synced) is the single source of truth; LinkedIn
// has NO public API to write your profile (the Profile Edit API is enterprise-partner-only), so
// this formats every field to LinkedIn's exact sections — Headline, About, Experience, Projects,
// Skills — making a manual paste fast. Regenerates from live data on each build, like /llms.txt.
// Not linked from the UI and marked noindex: it's a personal utility, not content.
import {
  mainHallExhibits,
  archiveExhibits,
  skillsExhibits,
  experienceExhibits,
  officeExhibits,
  type ExhibitPopup,
} from "@/data/projects";
import { PERSON, requestOrigin } from "@/lib/site";

const popups = (arr: { popup?: ExhibitPopup }[]): ExhibitPopup[] =>
  arr.map((e) => e.popup).filter((p): p is ExhibitPopup => Boolean(p));

// Clip to a LinkedIn field limit at a word boundary.
const clip = (text: string | undefined, max: number): string => {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, t.lastIndexOf(" ", max)).trimEnd() + "…";
};

// "May 2026 – Present" -> { start: "May 2026", end: "Present" }
const parseDates = (date?: string): { start: string; end: string } => {
  const [start, end] = (date ?? "").split(/\s*(?:[–—-]|to)\s*/i);
  return { start: (start ?? "").trim(), end: (end ?? "").trim() || "Present" };
};

// LinkedIn's "Employment type" isn't in the site data — assert only the unambiguous case.
const employmentType = (role?: string): string =>
  /\bintern(ship)?\b/i.test(role ?? "")
    ? "Internship"
    : "Full-time / Part-time / Internship / Contract   ← pick one";

// tech tags + the richer grouped skills, flattened & de-duped (case-insensitive, first wins).
const skillsOf = (p: ExhibitPopup): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...(p.tech ?? []), ...(p.skills ?? []).flatMap((g) => g.items)]) {
    const k = s.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(s); }
  }
  return out;
};

// Prefer a live/deployed/store link, else the first link.
const primaryLink = (p: ExhibitPopup): string => {
  const links = p.links ?? [];
  const live = links.find((l) => /live|play|store|demo|app store|devpost|website|site/i.test(l.label));
  return (live ?? links[0])?.url ?? "";
};

const RULE = "═".repeat(64);
const HR = "─".repeat(64);

export function GET(request: Request): Response {
  const today = new Date().toISOString().slice(0, 10);
  const origin = requestOrigin(request);
  const school = (PERSON.alumniOf ?? "").replace(/^University of\s+/i, "");

  // ── Headline (≤220) ──
  const current = popups(experienceExhibits).find((p) => /present|current/i.test(p.date ?? ""));
  const headline = clip(
    [
      current ? `${current.subtitle} @ ${current.title}` : PERSON.jobTitle,
      school ? `CS @ ${school}` : "",
    ].filter(Boolean).join("  ·  "),
    220,
  );

  // ── About (≤2,600) ──
  const about = clip(popups(officeExhibits).find((p) => p.title === "About Me")?.description, 2600);

  // ── Experience ──
  const experience = popups(experienceExhibits)
    .filter((p) => p.subtitle && p.title)
    .map((p, i) => {
      const { start, end } = parseDates(p.date);
      const skills = skillsOf(p).join(", ");
      return [
        `[${i + 1}] ${p.subtitle}`,
        `    Company:           ${p.title}`,
        `    Employment type:   ${employmentType(p.subtitle)}`,
        `    Start:             ${start}`,
        `    End:               ${end}`,
        `    Location:          [city, region · On-site / Hybrid / Remote]`,
        skills ? `    Skills to tag:     ${skills}` : "",
        `    Description (LinkedIn limit 2,000 chars — paste as-is):`,
        ``,
        clip(p.description, 2000),
      ].filter((l) => l !== "").join("\n");
    })
    .join(`\n\n${HR}\n\n`);

  // ── Projects (featured + archive) ──
  const projects = popups([...mainHallExhibits, ...archiveExhibits])
    .filter((p) => p.title)
    .map((p, i) => {
      const url = primaryLink(p);
      const skills = skillsOf(p).join(", ");
      return [
        `[${i + 1}] ${p.title}`,
        `    URL:            ${url || "[optional]"}`,
        skills ? `    Skills to tag:  ${skills}` : "",
        `    Description (LinkedIn limit 2,000 chars):`,
        ``,
        clip(p.description, 2000),
      ].filter((l) => l !== "").join("\n");
    })
    .join(`\n\n${HR}\n\n`);

  // ── Skills (flatten the site's aggregate skill groups, de-dupe, cap 50) ──
  const seen = new Set<string>();
  const allSkills: string[] = [];
  for (const g of popups(skillsExhibits)) {
    for (const s of g.tech ?? []) {
      const k = s.toLowerCase();
      if (!seen.has(k)) { seen.add(k); allSkills.push(s); }
    }
  }
  const skillList = allSkills
    .slice(0, 50)
    .map((s, i) => `${String(i + 1).padStart(2, " ")}. ${s}`)
    .join("\n");

  const body = `LINKEDIN UPDATE PACK — ${PERSON.name}
Generated ${today} from ${origin}

This website is the source of truth. LinkedIn has no API to write your profile, so paste the
fields below into LinkedIn to make it match. Everything here regenerates from the site on each
build, so re-open this page after you change the site, then update LinkedIn.

${RULE}
HEADLINE   ·   Profile → edit intro (pencil) → Headline   ·   limit 220   ·   suggested, tweak freely
${RULE}

${headline}

${RULE}
ABOUT   ·   Profile → About → pencil   ·   limit 2,600
${RULE}

${about}

${RULE}
EXPERIENCE   ·   Profile → Add section → Experience   ·   one entry each
${RULE}

${experience}

${RULE}
PROJECTS   ·   Profile → Add section → Recommended → Projects   ·   one entry each
${RULE}

${projects}

${RULE}
SKILLS   ·   Profile → Add section → Skills   ·   add in this order (first 3 show as pinned)
${RULE}

${skillList}
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
      "x-robots-tag": "noindex",
    },
  });
}
