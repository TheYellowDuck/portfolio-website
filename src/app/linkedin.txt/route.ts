// /linkedin.txt — a copy-paste "update pack" for keeping the LinkedIn profile in sync with this
// site. The website (src/data/projects.ts, GitHub-synced) is the single source of truth; LinkedIn
// has NO public API to write your profile (the Profile Edit API is enterprise-partner-only), so
// this formats every field to LinkedIn's exact sections — Headline, About, Experience, Projects,
// Skills — making a manual paste fast. Regenerates from live data on each build, like /llms.txt.
// Not linked from the UI and marked noindex: it's a personal utility, not content.
import {
  mainHallExhibits,
  skillsExhibits,
  experienceExhibits,
  officeExhibits,
  type ExhibitPopup,
} from "@/data/projects";
import resumeJson from "@/data/resume.generated.json";
import transcriptJson from "@/data/transcript.generated.json";
import type { ResumeData } from "@/types/resume";
import type { TranscriptData } from "@/types/transcript";
import { PERSON, requestOrigin } from "@/lib/site";

// Build-time-parsed résumé + transcript supply the LinkedIn sections that aren't on the site:
// Education, Honors & Awards, and Courses.
const resumeData = resumeJson as ResumeData;
const transcriptData = transcriptJson as TranscriptData;

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

  // ── Projects (featured only — the sync's top-scored work; the archive is left off) ──
  const projects = popups(mainHallExhibits)
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

  // ── Skills (curated from the live synced skills — dynamic, not a frozen list) ──
  // Rename to LinkedIn's exact (autocomplete-matching) names, order by recruiter value (first 3
  // pin), drop low-signal build tooling, and cap the count. Anything new you pick up flows through
  // (appended after the prioritized set), so this tracks the site's skills instead of being hardcoded.
  const SKILL_RENAME: Record<string, string[]> = {
    C: ["C (Programming Language)"],
    React: ["React.js"],
    Tailwind: ["Tailwind CSS"],
    "OOP & Design Patterns": ["Object-Oriented Programming (OOP)"],
    "Algorithms & DS": ["Data Structures", "Algorithms"],
    "Mobile Development": ["Android Development"],
    "Backend / APIs": ["REST APIs"],
    "Web Development": ["Full-Stack Development"],
  };
  const SKILL_PRIORITY = [
    "Python", "Java", "C++", "Computer Vision", "Machine Learning",
    "Data Structures", "Algorithms", "TypeScript", "JavaScript", "React.js",
    "Next.js", "Android Development", "Kotlin", "Object-Oriented Programming (OOP)",
    "REST APIs", "Full-Stack Development", "Game Development", "NumPy", "PyTorch",
    "Tailwind CSS", "Git", "C (Programming Language)",
  ];
  const SKILL_DROP = new Set(["Processing", "Swing", "SDL2", "Make", "CMake", "pip", "ESLint", "Vitest", "Gradle", "Framer Motion", "R"]);
  const SKILL_CAP = 26;

  const skillSeen = new Set<string>();
  const liveSkills: string[] = [];
  for (const g of popups(skillsExhibits)) {
    for (const raw of g.tech ?? []) {
      for (const name of SKILL_RENAME[raw] ?? [raw]) {
        const k = name.toLowerCase();
        if (!skillSeen.has(k) && !SKILL_DROP.has(name)) {
          skillSeen.add(k);
          liveSkills.push(name);
        }
      }
    }
  }
  const skillRank = (s: string) => {
    const i = SKILL_PRIORITY.indexOf(s);
    return i === -1 ? SKILL_PRIORITY.length : i;
  };
  const skillList = liveSkills
    .map((s, i) => ({ s, i }))
    .sort((a, b) => skillRank(a.s) - skillRank(b.s) || a.i - b.i) // priority first, else synced order
    .slice(0, SKILL_CAP)
    .map(({ s }, i) => `${String(i + 1).padStart(2, " ")}. ${s}`)
    .join("\n");

  // ── Education ──
  const education = (resumeData.sections.find((s) => /education/i.test(s.title))?.entries ?? [])
    .map((e, i) => {
      const { start, end } = parseDates(e.period);
      return [
        `[${i + 1}] ${e.title}`,
        e.subtitle ? `    Degree:    ${e.subtitle}` : "",
        transcriptData.program ? `    Program:   ${transcriptData.program}` : "",
        `    Dates:     ${start || "[start]"} – ${end}`,
        e.location ? `    Location:  ${e.location}` : "",
      ].filter(Boolean).join("\n");
    })
    .join(`\n\n${HR}\n\n`);

  // ── Honors & Awards (curated résumé awards + scholarships from the transcript footer) ──
  const awardBullets = resumeData.sections.find((s) => /award|achievement|honou?r/i.test(s.title))?.bullets ?? [];
  const honorEntries: { title: string; detail?: string }[] = [
    ...awardBullets.map((b) => {
      const [title, detail] = b.split(/\s*\|\s*/);
      return { title, detail };
    }),
    ...(transcriptData.scholarships ?? []).map((title) => ({ title })),
  ];
  const honors = honorEntries
    .map((e, i) => `[${i + 1}] ${e.title}${e.detail ? `\n    ${e.detail}` : ""}`)
    .join("\n\n");

  // ── Courses (just the technical core — CS/MATH/STAT/CO; breadth electives left off) ──
  const TECH = ["CS", "MATH", "STAT", "CO"];
  const cleanTitle = (t?: string) => (t ?? "").replace(/\s+/g, " ").trim().slice(0, 72);
  const courses = [...transcriptData.groups]
    .filter((g) => TECH.includes(g.subject))
    .sort((a, b) => TECH.indexOf(a.subject) - TECH.indexOf(b.subject))
    .flatMap((g) =>
      g.courses.map((c) => `- ${c.code}${c.title ? ` — ${cleanTitle(c.title)}` : ""}${c.inProgress ? " (in progress)" : ""}`),
    )
    .join("\n");

  // ── Featured (links to pin to the top of the profile) ──
  const featuredLinks = [
    `- Interactive portfolio: ${origin}`,
    `- Résumé (PDF): ${origin}${encodeURI(resumeData.pdfPath)}`,
    ...PERSON.sameAs.filter((u) => /github/i.test(u)).map((u) => `- GitHub: ${u}`),
  ].join("\n");

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
EDUCATION   ·   Profile → Add section → Education   ·   one entry each
${RULE}

${education}

${RULE}
PROJECTS   ·   Profile → Add section → Recommended → Projects   ·   one entry each
${RULE}

${projects}

${RULE}
SKILLS   ·   Profile → Add section → Skills   ·   add in this order (first 3 show as pinned)
${RULE}

${skillList}

${RULE}
HONORS & AWARDS   ·   Profile → Add section → Recommended → Honors & awards   ·   one entry each
${RULE}

${honors}

${RULE}
COURSES   ·   Profile → Add section → Recommended → Courses   ·   add the relevant ones
${RULE}

${courses}

${RULE}
FEATURED   ·   Profile → Add section → Featured → Add a link   ·   pin your best work to the top
${RULE}

${featuredLinks}
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
      "x-robots-tag": "noindex",
    },
  });
}
