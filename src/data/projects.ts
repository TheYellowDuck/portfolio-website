// ============================================================
// EXHIBIT — One simple type for everything
// ============================================================

export interface ExhibitLink {
  label: string;
  url: string;
}

export interface ExhibitPopup {
  title?: string;
  description?: string;

  // Add any links you want (GitHub, live demo, LinkedIn, etc.)
  links?: ExhibitLink[];

  // Tech stack tags (optional)
  tech?: string[];

  // Embed a playable demo, game, or CodeSandbox
  embedUrl?: string;

  // Control popup size (defaults provided)
  width?: string;   // e.g. "900px", "80vw"
  height?: string;  // e.g. "600px", "70vh"

  // Special popup types
  type?: "resume";
}

export interface Exhibit {
  // Optional: play a sound on interact
  audio?: string; // path relative to /public, e.g. "/assets/audio/quack.mp3"

  // Optional: show a popup. If missing, only audio plays.
  popup?: ExhibitPopup;
}

// ============================================================
// ROOM EXHIBITS — just add to the array, drop the tile on the map
// ============================================================

// Tile 10 — LOBBY / ENTRANCE
export const lobbyExhibits: Exhibit[] = [
  {
    popup: {
      title: "Welcome to My Museum!",
      description: "Thanks for visiting. Walk around and explore each wing to learn about my projects, skills, and experience. Use arrow keys or WASD to move, press E to interact.",
    },
  },
  {
    popup: {
      type: "resume",
    },
  },
  {
    popup: {
      title: "Guest Book",
      description: "Leave a message!",
      links: [
        { label: "Sign the Guest Book", url: "https://forms.google.com/your-form" },
      ],
    },
  },
];

// Tile 11 — MAIN HALL / FEATURED PROJECTS
export const mainHallExhibits: Exhibit[] = [
  {
    popup: {
      title: "File Organizer",
      description: "Automated file organization tool that sorts files using computer vision and NLP.",
      tech: ["Python", "OpenCV", "NLP"],
      links: [
        { label: "GitHub", url: "https://github.com/you/file-organizer" },
      ],
    },
  },
  {
    // A playable demo — iframe pops up centered on screen
    popup: {
      title: "Biquadris",
      description: "A Tetris-inspired puzzle game.",
      tech: ["C++", "X11"],
      embedUrl: "https://your-deployed-game.vercel.app",
      width: "900px",
      height: "650px",
      links: [
        { label: "Source Code", url: "https://github.com/you/biquadris" },
      ],
    },
  },
  {
    popup: {
      title: "UBC Rehab App",
      description: "Rehabilitation tracking application for UBC research.",
      tech: ["React", "TypeScript", "ML"],
      links: [
        { label: "GitHub", url: "https://github.com/you/rehab-app" },
        { label: "Research Paper", url: "https://example.com/paper" },
      ],
    },
  },
  {
    popup: {
      title: "Featured Project 4",
      description: "Your description here.",
      tech: ["Next.js", "Tailwind"],
    },
  },
  {
    popup: {
      title: "Featured Project 5",
      description: "Your description here.",
      tech: ["Python", "FastAPI"],
    },
  },
];

// Tile 12 — SKILLS & TECH WING
export const skillsExhibits: Exhibit[] = [
  {
    popup: {
      title: "Python & Backend",
      description: "Flask, FastAPI, automation scripts, data pipelines.",
      tech: ["Python", "Flask", "FastAPI"],
    },
  },
  {
    popup: {
      title: "React & TypeScript",
      description: "Frontend development, component architecture, state management.",
      tech: ["React", "TypeScript", "Next.js", "Tailwind"],
    },
  },
  {
    popup: {
      title: "C++ & Systems",
      description: "Low-level programming, game engines, performance-critical code.",
      tech: ["C++", "C", "Make"],
    },
  },
  {
    popup: {
      title: "ML & Computer Vision",
      description: "OpenCV, TensorFlow, image processing pipelines.",
      tech: ["Python", "OpenCV", "TensorFlow"],
    },
  },
  {
    popup: {
      title: "DevOps & Tools",
      description: "Git, Docker, CI/CD, Linux.",
      tech: ["Git", "Docker", "Linux"],
    },
  },
  {
    popup: {
      title: "Databases",
      description: "SQL, PostgreSQL, MongoDB.",
      tech: ["PostgreSQL", "MongoDB", "SQL"],
    },
  },
];

// Tile 13 — ARCHIVE / OTHER PROJECTS
export const archiveExhibits: Exhibit[] = [
  {
    popup: {
      title: "LeetCode Stats",
      description: "Your competitive programming journey.",
      tech: ["C++", "Python"],
      links: [{ label: "LeetCode Profile", url: "https://leetcode.com/you" }],
    },
  },
  {
    popup: {
      title: "Hackathon Project",
      description: "Built in 24 hours.",
      tech: ["React", "Node.js"],
    },
  },
  {
    popup: {
      title: "Side Project 1",
      description: "Your description here.",
      tech: ["Swift"],
    },
  },
  {
    popup: {
      title: "Side Project 2",
      description: "Your description here.",
      tech: ["Rust"],
    },
  },
  {
    popup: {
      title: "Side Project 3",
      description: "Your description here.",
      tech: ["Go"],
    },
  },
  {
    popup: {
      title: "Side Project 4",
      description: "Your description here.",
      tech: ["Java"],
    },
  },
];

// Tile 18 — EXPERIENCE / WORK HISTORY
export const experienceExhibits: Exhibit[] = [
  {
    popup: {
      title: "Ford Motor Company",
      description: "Software Engineering Co-op.",
      tech: ["Python", "React", "TypeScript"],
    },
  },
  {
    popup: {
      title: "Experience 2",
      description: "Your description here.",
      tech: [],
    },
  },
  {
    popup: {
      title: "Experience 3",
      description: "Your description here.",
      tech: [],
    },
  },
  {
    popup: {
      title: "Experience 4",
      description: "Your description here.",
      tech: [],
    },
  },
];

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
      description: "CS student at the University of Waterloo. Builder, problem solver. Currently on co-op at Ford.",
    },
  },
  {
    popup: {
      title: "Education",
      description: "University of Waterloo — Computer Science.",
    },
  },
  {
    popup: {
      title: "Interests",
      description: "Game dev, pixel art, open source, music.",
    },
  },
];

// Tile 15 — GIFT SHOP / CONTACT
export const giftShopExhibits: Exhibit[] = [
  {
    popup: {
      title: "GitHub",
      description: "Check out my code.",
      links: [{ label: "Open GitHub", url: "https://github.com/you" }],
    },
  },
  {
    popup: {
      title: "LinkedIn",
      description: "Let's connect!",
      links: [{ label: "Open LinkedIn", url: "https://linkedin.com/in/you" }],
    },
  },
  {
    popup: {
      title: "Email",
      description: "Reach out anytime.",
      links: [{ label: "Send Email", url: "mailto:you@email.com" }],
    },
  },
  {
    popup: {
      title: "This Portfolio's Source",
      description: "See how this museum was built.",
      links: [{ label: "View Source", url: "https://github.com/you/portfolio" }],
    },
  },
];

// Tile 16 — EASTER EGGS
export const easterEggExhibits: Exhibit[] = [
  {
    // Audio only — no popup
    audio: "/assets/audio/quack.mp3",
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

import { TILES } from "@/game/tilemap";

export const roomRegistry: Record<number, Exhibit[]> = {
  [TILES.EXPERIENCE]:  experienceExhibits,
  [TILES.MAIN_HALL]:   mainHallExhibits,
  [TILES.SKILLS_WING]: skillsExhibits,
  [TILES.ARCHIVE]:     archiveExhibits,
  [TILES.OFFICE]:      officeExhibits,
  [TILES.GIFT_SHOP]:   giftShopExhibits,
  [TILES.EASTER_EGG]:  easterEggExhibits,
  [TILES.RESUME]:      resumeExhibit,
};