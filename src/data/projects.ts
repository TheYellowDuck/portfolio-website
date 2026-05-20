import { TILES } from "@/game/tile-ids";

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

  // Control popup size (defaults provided)
  width?: string;   // e.g. "900px", "80vw"
  height?: string;  // e.g. "600px", "70vh"

  // Special popup types
  type?: "resume" | "transcript";
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
      subtitle: "Software Developer Intern",
      date: "May 2026 – Present",
      description: "Just getting started! Check back soon for updates on what I'm building.",
      tech: ["Java", "Kotlin", "Android SDK", "XML", "Git"],
      skills: [
        { category: "Android", items: ["Coroutines", "MVVM", "JUnit", "REST APIs"] },
        { category: "Tools",   items: ["Android Studio", "Gradle", "Jira", "Linux"] },
        { category: "Practice", items: ["Agile/Scrum", "OOP", "Code Review"] },
      ],
      width: "700px",
    },
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
      ],
      width: "800px",
      links: [
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
      ],
      width: "700px",
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
      type: "transcript",
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

export const roomRegistry: Record<number, Exhibit[]> = {
  [TILES.EXPERIENCE]: experienceExhibits,
  [TILES.MAIN_HALL]:  mainHallExhibits,
  [TILES.ARCHIVE]:    archiveExhibits,
  [TILES.OFFICE]:     officeExhibits,
  [TILES.GIFT_SHOP]:  giftShopExhibits,
  [TILES.EASTER_EGG]: easterEggExhibits,
  [TILES.RESUME]:     resumeExhibit,
};