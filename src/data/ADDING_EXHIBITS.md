// ============================================================
// HOW TO ADD AN EXHIBIT
// ============================================================
// All exhibits live in projects.ts. Find the array for the
// room you want, add an object, and you're done — no other
// files need to change.
//
// ROOM ARRAYS  →  where they appear in the museum
// ─────────────────────────────────────────────────────────
//   experienceExhibits  Work experience wing       (hand-written)
//   officeExhibits      Office — about me           (hand-written)
//   giftShopExhibits    Gift shop — contact links   (hand-written)
//   resumeExhibit       Standalone resume pedestal  (hand-written)
//   easterEggExhibits   Hidden easter eggs          (hand-written)
//   lobbyExhibits       Lobby / entrance            (hand-written)
//
//   mainHallExhibits    Main hall — featured projects   ┐ AUTO-GENERATED from GitHub
//   archiveExhibits     Archive — side / older projects ├ by the daily sync. DON'T hand-edit
//   skillsExhibits      Skills & tech wing              ┘ (use the sync config's `overrides`).
//
// ============================================================
// EXHIBIT SHAPE
// ============================================================
//
// interface Exhibit {
//   audio?: string;       // path from /public, e.g. "/assets/audio/quack.mp3"
//   popup?: ExhibitPopup;
// }
//
// interface ExhibitPopup {
//   title?:       string;
//   subtitle?:    string;          // shown below title in smaller muted text
//   date?:        string;          // shown below subtitle in sage/green text
//   description?: string;
//   tech?:        string[];        // shown as pill tags
//   skills?:      { category: string; items: string[] }[];  // grouped column
//   links?:       { label: string; url: string }[];
//   embedUrl?:    string;          // renders an iframe in the popup
//   width?:       string;          // e.g. "900px", "80vw"  (defaults provided)
//   height?:      string;          // e.g. "600px", "70vh"
//   videoUrl?:    string;          // autoplay-loop demo clip, e.g. "/videos/game.mp4"
//   type?:        "resume" | "transcript";  // special popup — resume / transcript viewer
// }

// ============================================================
// EXAMPLES
// ============================================================

// Audio only (easter egg / secret)
{ audio: "/assets/audio/quack.mp3" },

// Text popup only
{ popup: { title: "Hello", description: "Welcome to the museum." } },

// Title + subtitle + date (e.g. experience entry)
{ popup: { title: "Ford Motor Company", subtitle: "Software Developer Intern", date: "Jan 2025 – Apr 2025", description: "..." } },

// Full project card
{
  popup: {
    title: "My Project",
    description: "What it does and why it matters.",
    tech: ["React", "TypeScript", "Node.js"],
    links: [
      { label: "GitHub", url: "https://github.com/you/project" },
      { label: "Live Demo", url: "https://yourproject.com" },
    ],
  },
},

// Project with skills column (groups are color-coded; category name is for your reference only)
{
  popup: {
    title: "My Project",
    description: "A short description.",
    tech: ["Python", "FastAPI"],
    skills: [
      { category: "Technical",   items: ["REST API design", "Data modeling"] }, // sage green
      { category: "Soft Skills", items: ["Communication", "Ownership"] },       // dusty blue
      { category: "Tools",       items: ["Docker", "CI/CD"] },                  // terracotta
    ],
    links: [{ label: "GitHub", url: "https://github.com/you/project" }],
  },
},

// Playable demo / embedded iframe
{
  popup: {
    title: "My Game",
    description: "A Tetris-inspired puzzle game.",
    tech: ["C++", "X11"],
    embedUrl: "https://my-game.vercel.app",
    width: "900px",
    height: "650px",
    links: [{ label: "Source Code", url: "https://github.com/you/game" }],
  },
},

// Resume popup (opens the resume viewer)
{ popup: { type: "resume" } },

// Audio + popup together
{
  audio: "/assets/audio/discovery.mp3",
  popup: { title: "Secret Found!", description: "Nice work." },
},
