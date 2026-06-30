import { TILES } from "@/game/tile-ids";
import { LINKS } from "@/lib/site";
// Projects + skills are auto-generated from GitHub — see scripts/sync-github.mjs.
import { generatedMainHall, generatedInProgress, generatedArchive, generatedSkills } from "./github.generated";
import { generatedSkillCategories } from "./skill-categories.generated";
// Coursework skills are derived dynamically from the parsed transcript (see lib/course-skills).
import transcript from "@/data/transcript.generated.json";
import { deriveCourseworkSkills } from "@/lib/course-skills";
import type { TranscriptData } from "@/types/transcript";

// ============================================================
// EXHIBIT — One simple type for everything
// ============================================================

export interface ExhibitLink {
  label: string;
  url: string;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface ExhibitPopup {
  title?: string;
  subtitle?: string;
  date?: string;
  description?: string;

  // Add any links you want (GitHub, live demo, LinkedIn, etc.)
  links?: ExhibitLink[];

  // Tech stack tags (optional)
  tech?: string[];

  // Skills used — shown as a dedicated column in the popup body, grouped by category
  skills?: SkillGroup[];

  // Embed a playable demo, game, or CodeSandbox
  embedUrl?: string;

  // Short demo video (autoplay loop, shown instead of embedUrl for local apps)
  videoUrl?: string;  // e.g. "/videos/minesweeper.mp4"

  // Control popup size (defaults provided)
  width?: string;   // e.g. "900px", "80vw"
  height?: string;  // e.g. "600px", "70vh"

  // Special popup types
  type?: "resume" | "transcript";

  // Render the description as a hand-traced handwritten note (used for the Curator's Note reward).
  handwritten?: boolean;
}

export interface Exhibit {
  // Optional: play a sound on interact
  audio?: string; // path relative to /public, e.g. "/assets/audio/quack.mp3"

  // Optional: show a popup. If missing, only audio plays.
  popup?: ExhibitPopup;

  // Optional: NPC-style dialog — lines shown one at a time, advanced with E / tap.
  dialog?: string[];

  // Optional: shown on repeat interactions after `dialog` has played once.
  // Each entry is one bit (1–2 lines); they cycle in order.
  jokes?: string[][];
}

// ============================================================
// ROOM EXHIBITS — just add to the array, drop the tile on the map
// ============================================================

// Tile 11 — MAIN HALL / FEATURED PROJECTS
export const mainHallExhibits: Exhibit[] = generatedMainHall;

// Actively-built projects (GitHub topic `in-progress` etc.) — shown in their own group on the site,
// deliberately kept OUT of the scored ranking so an unfinished repo isn't judged as minor work.
export const inProgressExhibits: Exhibit[] = generatedInProgress;

// Tile 12 — SKILLS & TECH WING and the skill→category map are built FURTHER DOWN (`skillsExhibits`),
// just after `experienceExhibits`: the wing now aggregates work-experience skills too, so it can only
// be assembled once the experience data exists.

// Tile 13 — ARCHIVE / OTHER PROJECTS
export const archiveExhibits: Exhibit[] = generatedArchive;

// Tile 18 — EXPERIENCE / WORK HISTORY
export const experienceExhibits: Exhibit[] = [
  {
    popup: {
      title: "Ford Motor Company",
      subtitle: "Software Developer Intern",
      date: "May 2026 – Present",
      description: "Working on Android Automotive OS (AAOS) development at Ford, contributing to the in-vehicle Car Dialer app for Ford's infotainment system. Work spans call management via the Android Telecom framework, Bluetooth Hands-Free Profile (HFP) integration, UI development across multi-module architecture, and unit testing with Robolectric.",
      tech: ["Java", "Kotlin", "XML", "Android SDK", "Android Automotive OS", "Bash/Shell", "Groovy", "Git"],
      skills: [
        { category: "Frameworks",  items: ["Dagger Hilt", "AndroidX/Jetpack", "LiveData", "ViewModel", "Android Telecom", "Robolectric", "JaCoCo"] },
        { category: "Build & CI",  items: ["Gradle", "AOSP/Soong", "SonarQube", "ADB", "Docker"] },
        { category: "Tools",       items: ["Android Studio", "Jira", "Ford SDK", "scrcpy"] },
        { category: "Practice",    items: ["Unit Testing", "Code Review", "Multi-module Architecture", "Bluetooth/HFP", "Agile/Scrum", "OOP"] },
      ],    },
  },
  {
    popup: {
      title: "University of British Columbia",
      subtitle: "Undergraduate Research Assistant",
      date: "Jun 2025 – Aug 2025",
      description: "Worked under Dr. Martin McKeown and Prof. Z. Jane Wang at the Djavad Mowafaghian Centre for Brain Health, contributing to PIKA — an AI-driven Parkinson's care platform deployed at Vancouver Coastal Health. I owned development of two full-stack hand rehabilitation apps within the platform. HandEase gamifies rehab as a farming-style game where hand gestures control gameplay (finger tapping summons rain to water plants), making exercises feel engaging rather than clinical. Palm & Plant is the medical counterpart, designed for structured clinical sessions with detailed progress tracking. Both share the same core: a computer vision pipeline (OpenCV + MediaPipe) that detects 7 hand gestures at ~90% accuracy in real time (<100ms latency), running entirely on-device to meet PIPEDA and GDPR privacy requirements. I also built activity heatmap dashboards that cut practitioner monitoring overhead by 30%, giving clinicians a clearer picture of patient progress between appointments. Presented at the 11th Singapore International Parkinson Disease & Movement Disorders Symposium, with projected deployment across hospitals in 10+ countries.",
      tech: ["Python", "OpenCV", "MediaPipe", "NumPy", "Pandas", "Matplotlib"],
      skills: [
        { category: "AI & Vision",  items: ["Computer Vision", "Gesture Recognition", "Pose Estimation", "ML Inference", "Real-time Systems"] },
        { category: "Research",     items: ["Custom Libraries", "Data Analysis", "Research"] },
        { category: "Team",         items: ["Agile", "Weekly Standups", "Clinician Collaboration"] },
      ],      links: [
        { label: "McKeown Lab – PIKA", url: "https://mckeownlab.ca/pika/index.html" },
      ],
    },
  },
  {
    popup: {
      title: "Kumon Inc.",
      subtitle: "Math & Reading Instructor",
      date: "Aug 2021 – May 2024",
      description: "Recruited directly by the Kumon supervisor after standing out as a top-performing student in both Math and Literature — a distinction that made me more effective as an instructor from day one. Over three years, worked with 100+ students across a wide range of skill levels, adapting explanations on the fly to match each student's pace rather than following a rigid script. The core challenge was balancing class-wide flow with meaningful one-on-one attention — reading where each student was at, adjusting in the moment, and delivering feedback precise enough to move them forward without overwhelming them. Consistently saw improvement in both test results and student confidence over time.",
      skills: [
        { category: "Teaching",    items: ["1-on-1 Mentoring", "Curriculum Adaptation", "Lesson Planning", "Progress Tracking"] },
        { category: "Soft Skills", items: ["Communication", "Patience", "Adaptability", "Leadership"] },
        { category: "Management",  items: ["Classroom Management", "Feedback Delivery", "Student Assessment"] },
      ],    },
  },
];

// ── Tile 12 — SKILLS & TECH WING (built here: it aggregates experienceExhibits, defined above) ──
// One orb per CATEGORY, merging every skill from PROJECTS (the GitHub-scanned generatedSkills,
// already category-grouped), WORK EXPERIENCE (each role's grouped `skills`, a few categories aliased
// into the shared scheme), and COURSEWORK (transcript-derived, each carrying its category) — deduped.
// So e.g. "Frameworks" gathers framework skills from everywhere; nothing is hand-maintained twice.
const WORK_CAT_ALIAS: Record<string, string> = {
  Practice: "Concepts & Practices",
  "AI & Vision": "AI & ML",
  Team: "Soft Skills",
  Management: "Teaching",
};
const courseworkSkills = deriveCourseworkSkills(transcript as unknown as TranscriptData);
const skillCatOrder: string[] = [];
const skillCatItems = new Map<string, string[]>();
const skillCatDesc = new Map<string, string>();
const addSkillToCat = (category: string | undefined, name: string) => {
  const cat = category?.trim();
  if (!cat || !name) return;
  if (!skillCatItems.has(cat)) { skillCatItems.set(cat, []); skillCatOrder.push(cat); }
  const items = skillCatItems.get(cat)!;
  if (!items.includes(name)) items.push(name);
};
// 1) Projects — seed category order + descriptions from the generated wing (its own categories come
//    from the sync's CONCEPT_BUCKETS, so the categorisation stays dynamic / regenerated from source).
for (const e of generatedSkills) {
  const cat = e.popup?.title;
  if (!cat) continue;
  if (e.popup?.description && !skillCatDesc.has(cat)) skillCatDesc.set(cat, e.popup.description);
  for (const t of e.popup?.tech ?? []) addSkillToCat(cat, t);
}
// 2) Work experience — grouped skills by their (aliased) category, plus flat tech the taxonomy knows.
for (const e of experienceExhibits) {
  for (const g of e.popup?.skills ?? []) for (const item of g.items) addSkillToCat(WORK_CAT_ALIAS[g.category] ?? g.category, item);
  for (const t of e.popup?.tech ?? []) addSkillToCat(generatedSkillCategories[t], t);
}
// 3) Coursework — each skill carries the category its keyword rule assigned.
for (const { skill, category } of courseworkSkills) addSkillToCat(category, skill);

export const skillsExhibits: Exhibit[] = skillCatOrder.map((title) => {
  const description = skillCatDesc.get(title);
  const tech = skillCatItems.get(title)!;
  return { popup: description ? { title, description, tech } : { title, tech } };
});

// Maps a skill/tech name → its category, so bare chips on project, experience, and archive cards can
// be coloured by category — the same scheme as the Skills wing. The wing's aggregated groups come
// FIRST (authoritative category per canonical name), then each project's own `popup.skills` groups
// (whose RAW strings match the card chips), then the static taxonomy. First claim wins.
export const skillCategoryMap: Record<string, string> = {};
const claimSkill = (name: string, category: string) => {
  if (name && category && !(name in skillCategoryMap)) skillCategoryMap[name] = category;
};
for (const e of skillsExhibits) for (const item of e.popup?.tech ?? []) claimSkill(item, e.popup?.title ?? "");
for (const e of [...generatedMainHall, ...generatedInProgress, ...generatedArchive])
  for (const g of e.popup?.skills ?? []) for (const item of g.items) claimSkill(item, g.category);
for (const [name, category] of Object.entries(generatedSkillCategories)) claimSkill(name, category);

/** The current role — the experience entry whose date reads "Present"/"current", or undefined.
 *  Single source for "where George works now": the hero's status line and the Person `worksFor`
 *  structured data both derive from this, so the current employer is never hardcoded twice. */
export function currentRole(): ExhibitPopup | undefined {
  return experienceExhibits
    .map((e) => e.popup)
    .find((p): p is ExhibitPopup => !!p && /present|current/i.test(p.date ?? ""));
}

// Tile 19 — RESUME (standalone hallway pedestal)
export const resumeExhibit: Exhibit[] = [
  {
    popup: {
      type: "resume",
    },
  },
];

// Tile 14 — OFFICE / ABOUT ME
export const officeExhibits: Exhibit[] = [
  {
    popup: {
      title: "About Me",
      description: "The summer after grade 8, my parents signed me up for a Java course over Zoom — AP Computer Science, mostly to get me to stop playing video games. It backfired beautifully: I got hooked on building things instead, and now I build an unreasonable number of games anyway. I'm a CS student at the University of Waterloo, and what really gets me is figuring out how something works and then making something people can actually use — lately that's been Android Automotive at Ford and computer-vision rehab tools at a UBC research lab. Longer term I'm aiming for the deep end — the large-scale systems, AI, and quant work that the biggest tech, research, and trading firms are built on — and I'm at my best with a genuinely hard problem in front of me. Off the clock I'm usually on a snowboard, partway up a climbing wall, or somewhere new.",
    },
  },
  {
    popup: {
      type: "transcript",
    },
  },
  {
    popup: {
      title: "Interests",
      description: "Snowboarding and skiing in winter, climbing and hiking the rest of the year, and travelling somewhere new whenever I can — usually chasing good coffee and food along the way. Otherwise: board games and chess, a rotating lineup of film and anime, books, music, and building games and little open-source side projects for the fun of it.",
    },
  },
  {
    popup: {
      title: "Skills",
      description: "The full toolkit behind everything here — languages, frameworks, tools, and the concepts the projects are built on.",
      skills: skillsExhibits
        .map((e) => ({ category: e.popup?.title ?? "", items: e.popup?.tech ?? [] }))
        .filter((g) => g.category && g.items.length > 0),
    },
  },
  {
    popup: {
      title: "The Grind",
      description: "Competitive programming — a few hundred problems deep across LeetCode, the Canadian Computing Competition (CCC), and DMOPC.",
      width: "700px",
    },
  },
];

// Tile 15 — GIFT SHOP / CONTACT
export const giftShopExhibits: Exhibit[] = [
  {
    popup: {
      title: "GitHub",
      description: "Check out my code.",
      links: [{ label: "Open GitHub", url: LINKS.github }],
    },
  },
  {
    popup: {
      title: "LinkedIn",
      description: "Let's connect!",
      links: [{ label: "Open LinkedIn", url: LINKS.linkedin }],
    },
  },
  {
    popup: {
      title: "Email",
      description: "Reach out anytime.",
      links: [{ label: "Send Email", url: LINKS.email }],
    },
  },
  {
    popup: {
      title: "This Portfolio's Source",
      description: "See how this museum was built.",
      links: [{ label: "View Source", url: `${LINKS.github}/portfolio-website` }],
    },
  },
];

// "Me at the desk" — the NPC in the hallway alcove. Interact to chat.
export const meExhibit: Exhibit[] = [
  {
    dialog: [
      "Oh — hey! Didn't hear you come in.",
      "Welcome to the museum. I'm George — I built all of this.",
      "Every pedestal in here holds something I've made. Poke around; press E on anything that glows.",
      "There's a résumé by the entrance if you're the formal type, and my contact links are in the gift shop.",
      "Thanks for stopping by. Genuinely means a lot.",
      "Stick around — come bug me at the desk whenever.",
    ],
    jokes: [
      ["I built a whole museum to avoid writing a normal portfolio.", "The math on that still doesn't check out."],
      ["That fade you walked through to get here took me an afternoon.", "You blinked through it, didn't you."],
      ["This desk is the one thing in here with no collision bugs.", "Please don't mention that to the pedestals."],
      ["Everything in this room is real —", "except my composure in technical interviews."],
      ["I almost added a loading bar.", "Then realized watching it would be the most honest part of the site."],
      ["You're the third visitor today.", "The other two were me, checking the lighting."],
    ],
  },
];

// Tile 16 — EASTER EGGS
export const easterEggExhibits: Exhibit[] = [
  {
    // Audio only — no popup. Gain is reduced in the file; the ?v query is a
    // cache-buster so the browser can't serve a previously cached louder copy.
    audio: "/assets/audio/quack.mp3?v=4",
  },
  // {
  //   // Audio + popup
  //   audio: "/assets/audio/secret.mp3",
  //   popup: {
  //     title: "🔓 Secret Found!",
  //     description: "You found a hidden room. Not bad.",
  //   },
  // },
];

// ============================================================
// ROOM REGISTRY — maps tile IDs → exhibit lists
// ============================================================

export const roomRegistry: Record<number, Exhibit[]> = {
  [TILES.EXPERIENCE]: experienceExhibits,
  // The game has no separate "in progress" room, so current work shares the Main Hall (it's still
  // shown, just not split out the way the web view separates it from the ranked featured projects).
  [TILES.MAIN_HALL]:  [...mainHallExhibits, ...inProgressExhibits],
  [TILES.ARCHIVE]:    archiveExhibits,
  [TILES.OFFICE]:     officeExhibits,
  [TILES.GIFT_SHOP]:  giftShopExhibits,
  [TILES.EASTER_EGG]: easterEggExhibits,
  [TILES.RESUME]:     resumeExhibit,
};