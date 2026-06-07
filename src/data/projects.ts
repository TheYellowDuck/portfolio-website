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

  // Short demo video (autoplay loop, shown instead of embedUrl for local apps)
  videoUrl?: string;  // e.g. "/videos/minesweeper.mp4"

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
      title: "Minesweeper",
      description: "Java Swing Minesweeper with a built-in AI solver. Customizable board size and mine count, dark-themed UI with color-coded numbers. Auto Solve uses constraint propagation to pick the statistically safest tile at each step.",
      tech: ["Java", "Swing"],
      skills: [
        { category: "Core",         items: ["OOP design", "Lambda expressions", "Semaphore (dialog flow)", "Custom Comparator", "Exception handling"] },
        { category: "Swing / GUI",  items: ["JFrame / JDialog / JPanel", "Custom paintComponent", "MouseListener / ActionListener", "javax.swing.Timer", "Dynamic BufferedImage icons"] },
        { category: "Graphics",     items: ["Bevel tile rendering", "Anti-aliasing (RenderingHints)", "BasicStroke line drawing", "Font metrics layout", "Dark-theme palette"] },
        { category: "Algorithms",   items: ["Constraint propagation", "Mine probability estimation", "BFS flood-fill", "Random tie-breaking"] },
        { category: "Tooling",      items: ["javac / jar", "jpackage native bundling", "Java module system", "GitHub CLI releases"] },
      ],
      width: "840px",
      links: [
        { label: "GitHub", url: "https://github.com/TheYellowDuck/minesweeper" },
      ],
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
      links: [{ label: "LeetCode Profile", url: "https://leetcode.com/u/georgezhang006" }],
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
      title: "Image to ASCII",
      description: "Converts images (JPG, PNG, GIF) to ASCII art in a Java Swing viewer. Zoom in/out via buttons, Ctrl+scroll, or Ctrl+=/−. Pan with drag, arrow keys, or two-finger scroll. Fit-to-window button, and saves a grayscale output image alongside the original.",
      tech: ["Java", "Swing"],
      skills: [
        { category: "GUI",          items: ["JFrame / JScrollPane / JPanel", "JFileChooser", "Custom paintComponent", "InputMap / ActionMap shortcuts", "MouseAdapter (drag-to-pan)"] },
        { category: "Image",        items: ["Pixel RGB manipulation", "Rec. 601 grayscale luma", "ImageIO file I/O", "Image scaling (Graphics2D)", "ASCII character mapping"] },
        { category: "Rendering",    items: ["Off-screen BufferedImage cache", "Graphics2D antialiasing", "Bilinear / nearest-neighbor interp.", "Zoom & pan implementation"] },
        { category: "Engineering",  items: ["SwingWorker background proc.", "EDT compliance", "Static SHADE_MAP lookup", "StringBuilder optimization"] },
      ],
      width: "800px",
      links: [
        { label: "GitHub", url: "https://github.com/TheYellowDuck/ImageToText" },
      ],
    },
  },
  {
    popup: {
      title: "Exorcist",
      description: "An infinite climbing platformer. Jump between procedurally generated platforms, fight enemies, and climb as high as you can. Move, double jump, attack, and shield — 5 HP with 2 bonus overflow hearts, a stamina-based shield that blocks frontal attacks, and half-heart regen every 20 seconds. Enemies include the Wolf (fast, lunging), Golem (slow, tanky), Witch (ranged curse DoT), and Bat (free-flying). Height score is tracked and saved between sessions.",
      tech: ["Java", "Swing"],
      skills: [
        { category: "Architecture", items: ["Entity inheritance hierarchy", "Thread-based game loop (60 FPS)", "Camera / viewport system", "Tile-based procedural world", "Custom collision detection"] },
        { category: "Gameplay",     items: ["Gravity / double jump / knockback", "Stamina-based shield", "HP + overflow hearts", "Fall damage", "Half-heart regen"] },
        { category: "Enemy AI",     items: ["FSM per enemy (patrol/chase/attack)", "Edge-safe pathfinding", "Ranged curse DoT (Witch)", "Aerial free-roam pursuit (Bat)", "Invincibility frames"] },
        { category: "Graphics",     items: ["Sprite sheet parsing & animation", "AffineTransform flipping", "Alpha compositing", "HUD (hearts, shield bar)", "javax.sound.sampled audio"] },
      ],
      width: "800px",
      links: [
        { label: "GitHub", url: "https://github.com/TheYellowDuck/Exorcist" },
      ],
    },
  },
  {
    popup: {
      title: "Go",
      description: "A Go board game built in Java with Processing. Features Chinese rules scoring, ko rule detection, and 3D stone rendering.",
      tech: ["Java", "Processing"],
      skills: [
        { category: "Algorithms",   items: ["BFS flood-fill (territory count)", "DFS liberty detection", "Ko rule state comparison", "Suicide prevention check", "Chinese area scoring + komi"] },
        { category: "Game Logic",   items: ["Chinese rules engine", "Two-pass game end", "Real-time hover preview", "Win condition & declaration"] },
        { category: "Graphics",     items: ["Layered 3D stone rendering", "Shadow / gradient / specular ellipses", "Territory overlay at game end", "19×19 grid & star points"] },
        { category: "Java APIs",    items: ["Processing (PApplet)", "java.awt.Taskbar dock icon", "surface.setIcon() / PImage", "Mouse input via Processing"] },
      ],
      width: "800px",
      links: [
        { label: "GitHub", url: "https://github.com/TheYellowDuck/go-board-game" },
      ],
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
      description: "Working on Android Automotive OS (AAOS) development at Ford, contributing to the in-vehicle Car Dialer app for Ford's infotainment system. Work spans call management via the Android Telecom framework, Bluetooth Hands-Free Profile (HFP) integration, UI development across multi-module architecture, and unit testing with Robolectric.",
      tech: ["Java", "Kotlin", "XML", "Android SDK", "Android Automotive OS", "Bash/Shell", "Groovy", "Git"],
      skills: [
        { category: "Frameworks",  items: ["Dagger Hilt", "AndroidX/Jetpack", "LiveData", "ViewModel", "Android Telecom", "Robolectric", "JaCoCo"] },
        { category: "Build & CI",  items: ["Gradle", "AOSP/Soong", "SonarQube", "ADB", "Docker"] },
        { category: "Tools",       items: ["Android Studio", "Jira", "Ford SDK", "scrcpy"] },
        { category: "Practice",    items: ["Unit Testing", "Code Review", "Multi-module Architecture", "Bluetooth/HFP", "Agile/Scrum", "OOP"] },
      ],
      width: "800px",
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
      links: [{ label: "Open GitHub", url: "https://github.com/TheYellowDuck" }],
    },
  },
  {
    popup: {
      title: "LinkedIn",
      description: "Let's connect!",
      links: [{ label: "Open LinkedIn", url: "https://linkedin.com/in/iamgeorgezhang/" }],
    },
  },
  {
    popup: {
      title: "Email",
      description: "Reach out anytime.",
      links: [{ label: "Send Email", url: "mailto:gzhang06@outlook.com" }],
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