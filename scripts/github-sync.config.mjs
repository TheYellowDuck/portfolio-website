// ── GitHub → website sync config ────────────────────────────────────────────
// Edit this file to control what shows up. Run `npm run sync:github` (or let the
// scheduled GitHub Action do it) to regenerate src/data/github.generated.ts.

export const config = {
  username: "TheYellowDuck",

  // Competitive-programming handles (read by sync-cp-stats.mjs) — kept here so every profile handle
  // the build-time sync scripts need lives in one place.
  leetcode: "georgezhang006",
  dmoj: "georgezhang006",

  // Repos to skip entirely. Exact names or simple globs ("test-*", "*-fork").
  ignore: [
    "ML-For-Beginners", // Microsoft course fork
    "AI-For-Beginners", // Microsoft course fork
  ],

  // Filtering
  skipForks: true,        // hide repos you forked
  skipArchived: false,    // hide archived repos
  skipNoDescriptionAndNoStars: false, // hide bare repos (no description AND 0 stars)

  // Which repos land in the Main Hall ("featured"); the rest go to the Archive.
  // List names to force-feature them regardless of score:
  featured: [
    // "MyFridge",
  ],
  // Auto-feature any repo whose significance score is at or above this threshold (not a
  // fixed count — the number featured floats with how many clear the bar). Run the sync and
  // read the printed ranking to pick a value. Higher = more selective. Set in the natural gap
  // between the strong tier (≈44+) and the simpler/game tier (≈35), so "featured" reads as
  // genuinely impressive work by difficulty/scope.
  featuredThreshold: 45,

  // Soft skills can't be read from code (they're not in the repo), so list the ones
  // you want shown here. They appear as their own "Soft Skills" group, always.
  softSkills: [
    // "Problem Solving", "Collaboration", "Communication", "Self-Learning",
  ],
  // Infer a couple of evidence-based soft skills from the scan (repos with multiple
  // contributors → "Collaboration"; thoroughly-documented repos → "Technical Writing").
  inferSoftSkills: true,

  // Demo videos: self-host a repo's committed demo file when it's at or under this size
  // (in MB). Anything bigger keeps its README YouTube embed instead — so the repo stays
  // small and the projects page stays light. (Oversized Git LFS videos are skipped too.)
  selfHostVideoMaxMB: 5,

  // Links found in a repo's README are surfaced as buttons, labeled by URL.
  // Add your own — first matching rule wins (substring, case-insensitive).
  linkRules: [
    { match: "play.google.com", label: "Google Play" },
    { match: "apps.apple.com", label: "App Store" },
    { match: "itunes.apple.com", label: "App Store" },
    { match: "chrome.google.com/webstore", label: "Chrome Web Store" },
    { match: "addons.mozilla.org", label: "Firefox Add-on" },
    { match: "devpost.com", label: "Devpost" },
    { match: "itch.io", label: "itch.io" },
    { match: "marketplace.visualstudio.com", label: "VS Code Marketplace" },
    { match: "npmjs.com/package", label: "npm" },
    { match: "pypi.org/project", label: "PyPI" },
    { match: ".vercel.app", label: "Live Demo" },
    { match: ".netlify.app", label: "Live Demo" },
    { match: ".github.io", label: "Live Demo" },
    { match: ".herokuapp.com", label: "Live Demo" },
    { match: ".onrender.com", label: "Live Demo" },
    { match: ".pages.dev", label: "Live Demo" },
    { match: ".streamlit.app", label: "Live Demo" },
  ],

  // Per-repo overrides — re-curate anything the auto data gets wrong. Any field
  // here wins over the GitHub-derived value. Keys are repo names (case-sensitive).
  overrides: {
    // `bias: ±N` — a manual score nudge for what the auto-scorer genuinely can't read: code
    // quality, a competition result, architecture elegance. It shows next to the repo in the
    // ranking printout, so it's never a hidden thumb on the scale.
    Robotics: { bias: -5 }, // strong on paper (CV + LiDAR + Worlds) but messy code, didn't place
    // "biquadris": {
    //   title: "Biquadris",
    //   description: "A two-player Tetris variant — full OOP design in C++.",
    //   tech: ["C++", "OOP", "Make"],
    //   videoUrl: "/videos/biquadris.mp4",   // or embedUrl: "https://…"
    //   featured: true,
    //   order: 1,        // lower = earlier within its section
    //   hidden: false,   // true = drop it from the site entirely
    // },
  },
};

// ── Detection tables ─────────────────────────────────────────────────────────
// Dependency / package name → the skill label to show. Matched against
// package.json, requirements.txt, Cargo.toml, go.mod, Gemfile, pom.xml, etc.
export const DEP_SKILLS = {
  // JS / TS ecosystem
  react: "React", "react-dom": "React", next: "Next.js", vue: "Vue", svelte: "Svelte",
  "@angular/core": "Angular", express: "Express", fastify: "Fastify", "socket.io": "Socket.IO",
  tailwindcss: "Tailwind", "styled-components": "styled-components", redux: "Redux",
  "framer-motion": "Framer Motion", three: "Three.js", d3: "D3", "chart.js": "Chart.js",
  prisma: "Prisma", mongoose: "MongoDB", pg: "PostgreSQL", mysql: "MySQL", mysql2: "MySQL",
  jest: "Jest", vitest: "Vitest", cypress: "Cypress", playwright: "Playwright",
  typescript: "TypeScript", eslint: "ESLint", webpack: "Webpack", vite: "Vite",
  electron: "Electron", "react-native": "React Native", expo: "Expo",
  // Python
  flask: "Flask", fastapi: "FastAPI", django: "Django", numpy: "NumPy", pandas: "Pandas",
  "scikit-learn": "scikit-learn", sklearn: "scikit-learn", tensorflow: "TensorFlow",
  torch: "PyTorch", pytorch: "PyTorch", "opencv-python": "OpenCV", "cv2": "OpenCV",
  mediapipe: "MediaPipe", matplotlib: "Matplotlib", scipy: "SciPy", pillow: "Pillow",
  requests: "Requests", beautifulsoup4: "BeautifulSoup", selenium: "Selenium",
  pygame: "Pygame", sqlalchemy: "SQLAlchemy", pydantic: "Pydantic",
  // LLM / generative-AI SDKs
  openai: "OpenAI API", anthropic: "Anthropic API", "google-generativeai": "Gemini API",
  langchain: "LangChain", litellm: "LiteLLM", "llama-index": "LlamaIndex",
  transformers: "Transformers", tiktoken: "tiktoken", chromadb: "ChromaDB", "faiss-cpu": "FAISS",
  // Other ecosystems
  spring: "Spring", "spring-boot": "Spring Boot", junit: "JUnit", gson: "Gson",
  tokio: "Tokio", serde: "Serde", actix: "Actix", clap: "clap",
  gin: "Gin", gorm: "GORM",
};

// File present in the repo tree → the tool/skill it implies. Matched against the
// repo's file paths (case-insensitive substring or exact basename).
export const TOOL_SIGNS = [
  { match: "dockerfile", skill: "Docker" },
  { match: "docker-compose", skill: "Docker" },
  { match: ".github/workflows/", skill: "GitHub Actions" },
  { match: "makefile", skill: "Make" },
  { match: "cmakelists.txt", skill: "CMake" },
  { match: "vite.config", skill: "Vite" },
  { match: "webpack.config", skill: "Webpack" },
  { match: "tailwind.config", skill: "Tailwind" },
  { match: "jest.config", skill: "Jest" },
  { match: "vitest.config", skill: "Vitest" },
  { match: ".eslintrc", skill: "ESLint" },
  { match: "tsconfig.json", skill: "TypeScript" },
  { match: "vercel.json", skill: "Vercel" },
  { match: "netlify.toml", skill: "Netlify" },
  { match: "kubernetes", skill: "Kubernetes" },
  { match: "terraform", skill: "Terraform" },
  { match: "prisma/schema.prisma", skill: "Prisma" },
  { match: "gradlew", skill: "Gradle" },
  { match: "pom.xml", skill: "Maven" },
  { match: "requirements.txt", skill: "pip" },
  { match: "rollup.config", skill: "Rollup" },
  { match: ".prettierrc", skill: "Prettier" },
  { match: "playwright.config", skill: "Playwright" },
  { match: "cypress.config", skill: "Cypress" },
  { match: ".storybook/", skill: "Storybook" },
  { match: "firebase.json", skill: "Firebase" },
  { match: "supabase/", skill: "Supabase" },
];

// Higher-level domains/concepts, inferred when ANY keyword shows up in a repo's
// skills, languages, topics, name, or description. (Lets pure-Java game repos still
// read as "Game Development," etc.)  Add your own.
export const DOMAIN_RULES = [
  { skill: "Computer Vision", any: ["opencv", "mediapipe", "yolo", "object detection", "face detection", "image segmentation", "image classification", "pose estimation"] },
  { skill: "Machine Learning", any: ["tensorflow", "pytorch", "scikit-learn", "sklearn", "keras", "neural network", "machine learning", "deep learning"] },
  // NOTE: keep keywords specific — these are substring-matched against repo text, so short tokens
  // like "rag" would hit "fragment"/"storage"/"drag" (use "retrieval-augmented" instead).
  { skill: "Generative AI / LLMs", any: ["large language model", " llm", "llm ", "openai", "anthropic", "claude", "gemini", "langchain", "litellm", "llamaindex", "retrieval-augmented", "prompt engineering", "agentic", "ai agent", "embeddings", "vector database", "vector store", "fine-tuning", "hugging face", "generative ai"] },
  { skill: "Statistics & Evaluation", any: ["significance test", "confidence interval", "wilson", "p-value", "hypothesis test", "statistical significance", "ablation", "evaluation harness", "benchmark harness", "pass@k", "reproducib", "a/b test"] },
  { skill: "Data Analysis", any: ["numpy", "pandas", "matplotlib", "scipy", "jupyter", "data analysis", "dataset", "visualization"] },
  { skill: "Web Development", any: ["react", "vue", "next.js", "svelte", "angular", "tailwind", "html", "css", "express", "django", "flask", "fastapi"] },
  { skill: "Backend / APIs", any: ["express", "fastapi", "flask", "django", "spring", "rest api", "graphql", "endpoint", "backend"] },
  { skill: "Game Development", any: ["pygame", "processing", "unity", "godot", "sdl", "game", "platformer", "shooter", "tetris", "snake", "pong", "arcade", "roguelike"] },
  { skill: "Mobile Development", any: ["kotlin", "swift", "react native", "flutter", "android", "jetpack compose", "ios app"] },
  { skill: "DevOps", any: ["docker", "kubernetes", "github actions", "ci/cd", "terraform", "deployment"] },
  { skill: "Algorithms & DS", any: ["competitive-programming", "competitive programming", "leetcode", "algorithm", "data structure", "dynamic programming", "binary tree", "linked list", "recursion"] },
  { skill: "Automation / Scraping", any: ["automation", "scraper", "scraping", "selenium", "beautifulsoup", "bot", "cron job"] },
  // Concepts/competencies, usually evidenced in the README prose (now part of the description).
  { skill: "OOP & Design Patterns", any: ["object-oriented", "object oriented", " oop ", "design pattern", "observer pattern", "factory pattern", "decorator pattern", "singleton", "mvc", "encapsulation", "polymorphism", "inheritance"] },
  { skill: "Concurrency", any: ["multithread", "multi-thread", "multithreaded", "concurren", "thread-safe", "parallel comput", "synchroniz", "mutex", "race condition", "tokio", "asyncio", "coroutine", "goroutine", "async/await"] },
  { skill: "Networking", any: ["socket", "multiplayer", "client-server", "client/server", "tcp", "udp", "websocket", "networking", "peer-to-peer"] },
  { skill: "Game Physics", any: ["physics engine", "collision detection", "collision", "rigid body", "hitbox", "gravity"] },
  { skill: "Game AI", any: ["pathfinding", "minimax", "a* search", "enemy ai", "game ai", "behavior tree", "procedural generation", "procedurally generated"] },
  { skill: "Testing", any: ["unit test", "junit", "test-driven", " tdd ", "test coverage", "integration test"] },
  // Advanced / "hard" domains — grounded in dependencies, topics and README evidence (not just
  // buzzwords), so genuinely difficult work outside games/web gets recognised by the score.
  { skill: "3D Graphics", any: ["opengl", "webgl", "vulkan", "three.js", "shader", "ray tracing", "raytracing", "raycast", "ray-cast", "3d render", "3d graphics", "lwjgl", "glfw", "pyopengl"] },
  { skill: "Robotics & Embedded", any: ["robotics", "embedded system", "firmware", "microcontroller", "arduino", "raspberry pi", "rtos", " ros ", "sensor fusion", "actuator", "bare-metal", "control system"] },
  { skill: "Security & Cryptography", any: ["cryptograph", "encryption", "aes-256", "rsa encryption", "hashing algorithm", "penetration test", "vulnerabilit", "reverse engineer", "openssl", "libsodium", "cybersecurity"] },
  { skill: "Compilers & Languages", any: ["compiler", "interpreter", "lexer", "tokeniz", "bytecode", "abstract syntax tree", "llvm", "antlr", "parser combinator", "recursive descent"] },
  { skill: "Distributed Systems", any: ["distributed system", "consensus algorithm", "paxos", "kafka", "microservice", "sharding", "replication", "grpc", "map-reduce", "mapreduce"] },
];

// Which display-category each skill falls under, for the grouped Skills section.
// (Languages, Domains, and Soft Skills are assembled at runtime.)
export const SKILL_CATEGORY = {
  Concepts: ["Computer Vision", "Machine Learning", "Data Analysis", "Web Development", "Backend / APIs", "Game Development", "Mobile Development", "DevOps", "Algorithms & DS", "Automation / Scraping", "OOP & Design Patterns", "Concurrency", "Networking", "Game Physics", "Game AI", "Testing", "3D Graphics", "Robotics & Embedded", "Security & Cryptography", "Compilers & Languages", "Distributed Systems"],
  Frameworks: ["React", "Next.js", "Vue", "Svelte", "Angular", "Express", "Fastify", "Flask", "FastAPI", "Django", "Spring", "Spring Boot", "Three.js", "Pygame", "React Native", "Expo", "Electron", "Socket.IO", "Gin", "Actix", "Firebase", "Supabase", "Swing", "JavaFX", "Jetpack Compose", "SDL2", "AWT"],
  "ML / Data": ["NumPy", "Pandas", "scikit-learn", "TensorFlow", "PyTorch", "OpenCV", "MediaPipe", "Matplotlib", "SciPy", "D3", "Chart.js"],
  Databases: ["PostgreSQL", "MySQL", "MongoDB", "SQLAlchemy", "Prisma", "GORM"],
  Tools: ["Docker", "GitHub Actions", "Make", "CMake", "Vite", "Webpack", "Rollup", "Tailwind", "Jest", "Vitest", "Cypress", "Playwright", "ESLint", "Prettier", "Storybook", "TypeScript", "Git", "Gradle", "Maven", "pip", "JUnit", "Selenium", "Vercel", "Netlify", "Kubernetes", "Terraform"],
};
