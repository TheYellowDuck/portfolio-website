// ── GitHub → website sync ────────────────────────────────────────────────────
// Fetches your repos, detects languages / frameworks / tools, and writes
// src/data/github.generated.ts (consumed by both the web portfolio and the game).
//
//   GITHUB_TOKEN=ghp_xxx node scripts/sync-github.mjs
//
// A token (public-repo read) raises the rate limit from 60/hr to 5000/hr — needed
// for the deep dependency/tool scan. Without one it still runs, degrading to a
// languages-only scan once the unauthenticated budget runs out.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, DEP_SKILLS, TOOL_SIGNS, DOMAIN_RULES, SKILL_CATEGORY } from "./github-sync.config.mjs";

// Named tech we'll recognise if a README's "Tech Stack / Built With" section lists
// it (catches things with no package manifest, e.g. SDL2, Swing, OpenGL).
const KNOWN_SKILLS = [...new Set([
  ...Object.values(DEP_SKILLS), ...TOOL_SIGNS.map((t) => t.skill), ...DOMAIN_RULES.map((d) => d.skill),
  "TypeScript", "JavaScript", "Python", "Java", "C++", "C", "C#", "Kotlin", "Swift", "Go", "Rust", "Ruby", "PHP",
  "HTML", "CSS", "SQL", "Shell", "Bash", "Processing", "Lua", "Dart", "R", "MATLAB", "Assembly",
  "SDL2", "SDL", "OpenGL", "WebGL", "Swing", "JavaFX", "JUnit", "Jetpack Compose", "GraphQL", "WebSocket", "REST",
])];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "src", "data", "github.generated.ts");
const VIDEO_DIR = path.join(__dirname, "..", "public", "videos");
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

// Above this we don't self-host — bigger demos use the README's YouTube embed instead
// (keeps the repo small and the projects page light). Tune via config.selfHostVideoMaxMB.
const SELF_HOST_MAX = (config.selfHostVideoMaxMB ?? 5) * 1024 * 1024;
// Download a repo's demo video into /public so the site serves it as real video/mp4
// (GitHub raw serves octet-stream, which <video> rejects; the public CDNs are flaky).
async function downloadVideo(url, dest) {
  // Trust an existing real download; clear a tiny stub (stale LFS pointer / error page) and retry.
  if (fs.existsSync(dest)) {
    if (fs.statSync(dest).size > 1024) return true;
    fs.rmSync(dest);
  }
  // One controller covers BOTH the headers and the (heavily throttled) body read — a
  // generous 7-minute cap fits multi-MB demos at raw GitHub's ~24 KB/s while still
  // killing a truly dead connection instead of hanging the whole sync.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 420000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "museum-portfolio-sync" }, signal: ctrl.signal });
    if (!res.ok) return false;
    if (Number(res.headers.get("content-length") || 0) > SELF_HOST_MAX) return false;
    let buf = Buffer.from(await res.arrayBuffer());
    // Git LFS: raw serves a ~130-byte text pointer, not the file. Read the real size from the
    // pointer, honor the cap, then pull the actual bytes from the media (LFS) endpoint.
    if (buf.length < 1024 && buf.toString("utf8", 0, 40).startsWith("version https://git-lfs")) {
      const size = Number(buf.toString().match(/\nsize (\d+)/)?.[1] || 0);
      if (!size || size > SELF_HOST_MAX) return false;
      const mediaUrl = url.replace("https://raw.githubusercontent.com/", "https://media.githubusercontent.com/media/");
      const r2 = await fetch(mediaUrl, { headers: { "User-Agent": "museum-portfolio-sync" }, signal: ctrl.signal });
      if (!r2.ok) return false;
      buf = Buffer.from(await r2.arrayBuffer());
    }
    if (buf.length < 1024) return false; // not a real video
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return true;
  } catch { return false; }
  finally { clearTimeout(timer); }
}

// Download all queued demo videos at once — raw GitHub throttles each connection hard,
// so serial would crawl; in parallel the total ≈ the single slowest file. Live progress
// bar; on a failed download we drop that popup's videoUrl and fall back to its YouTube embed
// (if any) so the site shows that instead of a broken video.
async function downloadVideos(queue) {
  const total = queue.length;
  let done = 0, ok = 0;
  const render = () => {
    const w = 22, f = Math.round((done / total) * w);
    process.stdout.write(`\r  videos [${"█".repeat(f)}${"░".repeat(w - f)}] ${done}/${total}`);
  };
  render();
  await Promise.all(queue.map(async (t) => {
    if (await downloadVideo(t.url, t.dest)) ok++;
    else { delete t.popup.videoUrl; if (t.embedFallback) t.popup.embedUrl = t.embedFallback; }
    done++; render();
  }));
  process.stdout.write(`\n  ${ok}/${total} videos ready${ok < total ? ` — ${total - ok} failed, re-run to retry` : ""}.\n`);
}
const API = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "museum-portfolio-sync",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

// fetch with a hard timeout — a stalled download/request can't hang the whole sync.
async function fetchTimeout(url, opts = {}, ms = 25000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(timer); }
}

let remaining = Infinity;
async function gh(pathOrUrl) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : API + pathOrUrl;
  const res = await fetchTimeout(url, { headers: HEADERS }, 25000);
  const rem = res.headers.get("x-ratelimit-remaining");
  if (rem != null) remaining = Number(rem);
  if (res.status === 404) return null;
  if (res.status === 403 && remaining === 0) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${url}`);
  return res.json();
}

const MANIFESTS = ["package.json", "requirements.txt", "pyproject.toml", "Pipfile", "Cargo.toml", "go.mod", "Gemfile", "pom.xml", "build.gradle"];

function ignored(name) {
  return config.ignore.some((p) => {
    if (p.includes("*")) {
      const re = new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", "i");
      return re.test(name);
    }
    return p.toLowerCase() === name.toLowerCase();
  });
}

function humanize(name) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ").trim()
    .split(" ")
    .map((w) => (w.length <= 1 ? w.toUpperCase() : w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

// Headings whose section is setup/meta, not "what the project is" — stop here.
const STOP_HEADING = /\b(install|setup|getting[ -]?started|usage|how to|build|compil|prerequisit|requirement|dependenc|configur|deploy|test|contribut|licen[sc]e|acknowledg|credit|roadmap|changelog|table of contents|contents|screenshot|gallery|clon|download|run the)/i;

// Build a rich description from a README: skip the title / badges / images / tables,
// gather the intro plus any Features/Overview prose (and bullet lists), and stop at
// the first setup/usage/license section. The card clamps this to a few lines; the
// popup shows it all — so we pull generously.
function readmeDescription(md) {
  if (!md) return "";
  const blocks = md.replace(/\r/g, "").split(/\n\s*\n/);
  const parts = [];
  let started = false;
  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim());
    if (!lines[0]) continue;
    if (/^#{1,6}\s/.test(lines[0])) {
      const heading = lines[0].replace(/^#{1,6}\s*/, "");
      if (started && STOP_HEADING.test(heading)) break; // reached install/usage/etc.
    }
    started = true;
    const body = lines.filter((l) => l && !/^#{1,6}\s/.test(l) && !/^(\[!\[|!\[|<\/?\w|\||[-=]{3,}|>)/.test(l));
    if (!body.length) continue;
    const bullets = body.filter((l) => /^[-*+]\s/.test(l));
    let chunk = (bullets.length >= 2 && bullets.length >= body.length - 1)
      ? bullets.map((l) => l.replace(/^[-*+]\s*/, "")).join("; ")
      : body.filter((l) => !/^[-*+]\s/.test(l)).join(" ");
    chunk = chunk.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim();
    if (chunk.length >= 12) parts.push(chunk);
    if (parts.join(" ").length > 4200) break; // safety ceiling only
  }
  let text = parts.join(" ").replace(/\s+/g, " ").trim();
  // The stop-heading already bounds this to the "what it is + features" content, so
  // we keep all of it; only trim a pathologically long intro at a sentence boundary.
  const MAX = 4000;
  if (text.length > MAX) {
    const cut = text.slice(0, MAX);
    const dot = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf("; "));
    text = dot > 1000 ? cut.slice(0, dot + 1) : cut.replace(/\s+\S*$/, "") + "…";
  }
  return text;
}

function depsFrom(filename, text) {
  const found = new Set();
  const lc = filename.toLowerCase();
  try {
    if (lc === "package.json") {
      const j = JSON.parse(text);
      for (const k of Object.keys({ ...j.dependencies, ...j.devDependencies })) if (DEP_SKILLS[k]) found.add(DEP_SKILLS[k]);
    } else {
      const hay = text.toLowerCase();
      for (const [dep, skill] of Object.entries(DEP_SKILLS)) {
        const re = new RegExp(`(^|[^a-z0-9_-])${dep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9_.-]|$)`, "i");
        if (re.test(hay)) found.add(skill);
      }
    }
  } catch { /* ignore parse errors */ }
  return found;
}

// Pull explicitly-listed tech out of a README's "Tech Stack / Built With" section.
function techFromReadme(md) {
  if (!md) return [];
  const m = md.match(/(?:^|\n)#{1,4}[^\n]*\b(?:built with|tech stack|technologies|tools used|the stack|made with|frameworks?|libraries|skills?(?: demonstrated| used| applied)?|key skills|highlights|what i (?:built|learned|did))\b[^\n]*\n([\s\S]*?)(?:\n#{1,4}\s|\n{3,}|$)/i);
  if (!m) return [];
  const section = m[1];
  const out = new Set();
  // 1) Known tech mentioned anywhere in the section.
  const hay = section.toLowerCase();
  for (const skill of KNOWN_SKILLS) {
    const re = new RegExp(`(^|[^a-z0-9+#.])${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+#.]|$)`, "i");
    if (re.test(hay)) out.add(skill);
  }
  // 2) Bullet items as the author's own curated skill/tech list, from explicit
  // "Skills Demonstrated" / "Tech Stack" sections. No count limit — capture every one the
  // author listed; a single light guard just skips non-tag lines (empty, or a runaway
  // full-sentence bullet that clearly isn't a tag).
  for (const line of section.split("\n")) {
    const bm = line.trim().match(/^[-*+]\s+(.+)$/);
    if (!bm) continue;
    let item = bm[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").trim();
    item = item.split(/:| [-—–] /)[0].trim(); // drop "OOP — used for…" explanations, keep "OOP"
    if (item && item.length <= 80 && /^[A-Za-z0-9]/.test(item)) out.add(item);
  }
  return [...out];
}

// Higher-level domains, from any keyword across the repo's signals.
function inferDomains(repo, scan) {
  const hay = [repo.name, repo.description || "", (scan.readme || "").slice(0, 1800), ...(repo.topics || []), ...scan.languages, ...scan.skills].join(" ").toLowerCase();
  return DOMAIN_RULES.filter((r) => r.any.some((k) => hay.includes(k))).map((r) => r.skill);
}

async function scanRepo(repo) {
  const { login: owner } = repo.owner;
  const name = repo.name;
  const skills = new Set();

  // Languages (cheap — always).
  let langs = {};
  try { langs = (await gh(repo.languages_url)) || {}; } catch (e) { if (e.message === "RATE_LIMIT") throw e; }
  const codeBytes = Object.values(langs).reduce((a, b) => a + b, 0); // code only — excludes committed videos/assets
  // Keep substantial languages only: the top one, plus any ≥5% of bytes that isn't a build/config
  // "language" — drops trivial detections (a stray shell script, generated HTML/CSS) that pad breadth.
  const NON_LANGS = new Set(["Makefile", "CMake", "Dockerfile", "Batchfile", "Roff", "M4", "Gnuplot", "Shell"]);
  const languages = Object.entries(langs)
    .sort((a, b) => b[1] - a[1])
    .filter(([k, b], i) => (i === 0 || b >= codeBytes * 0.05) && !NON_LANGS.has(k))
    .map(([k]) => k);
  languages.forEach((l) => skills.add(l));

  let readme = "";
  let videoRawUrl = "";
  let videoExt = "mp4";
  let videoSize = 0;
  // Deep scan only while we have rate budget (a token makes this always true).
  if (remaining > 10) {
    try {
      const tree = await gh(`/repos/${owner}/${name}/git/trees/${repo.default_branch}?recursive=1`);
      const blobs = (tree?.tree || []).filter((t) => t.type === "blob");
      const paths = blobs.map((t) => t.path);
      for (const sign of TOOL_SIGNS) if (paths.some((p) => p.toLowerCase().includes(sign.match))) skills.add(sign.skill);
      // A committed demo video. Small ones we self-host into /public (see main); big ones
      // fall back to the README's YouTube embed. Prefer a file named "demo".
      const vids = paths.filter((p) => /\.(mp4|webm|mov)$/i.test(p));
      const vid = vids.find((p) => /demo/i.test(p)) || vids[0];
      if (vid) {
        videoRawUrl = `https://raw.githubusercontent.com/${owner}/${name}/${repo.default_branch}/${vid.split("/").map(encodeURIComponent).join("/")}`;
        videoExt = vid.split(".").pop().toLowerCase();
        videoSize = blobs.find((t) => t.path === vid)?.size || 0; // LFS files report the pointer size (~130 B)
      }
      for (const p of paths) {
        const base = p.split("/").pop();
        if (MANIFESTS.includes(base) && remaining > 8) {
          const file = await gh(`/repos/${owner}/${name}/contents/${p.split("/").map(encodeURIComponent).join("/")}`);
          const text = file?.content ? Buffer.from(file.content, "base64").toString("utf8") : "";
          depsFrom(base, text).forEach((s) => skills.add(s));
        }
      }
    } catch (e) { if (e.message === "RATE_LIMIT") throw e; }
    if (remaining > 8) {
      try {
        const r = await gh(`/repos/${owner}/${name}/readme`);
        if (r?.content) readme = Buffer.from(r.content, "base64").toString("utf8");
      } catch (e) { if (e.message === "RATE_LIMIT") throw e; }
    }
  }
  techFromReadme(readme).forEach((s) => skills.add(s));

  // For the "Collaboration" soft skill — was this a multi-person repo?
  let multiContributor = false;
  if (config.inferSoftSkills && remaining > 8) {
    try {
      const c = await gh(`/repos/${owner}/${name}/contributors?per_page=2`);
      multiContributor = Array.isArray(c) && c.length > 1;
    } catch (e) { if (e.message === "RATE_LIMIT") throw e; }
  }
  return { languages, codeBytes, skills: [...skills], readme, videoRawUrl, videoExt, videoSize, multiContributor };
}

// Pull a demo video and/or labeled links out of a README. Works off every URL in
// the text (so badge-style store links like Google Play, which wrap an image, are
// caught), classified by domain via config.linkRules.
function extractMedia(md) {
  const out = { links: [] };
  if (!md) return out;
  const urls = [...md.matchAll(/https?:\/\/[^\s)"'\]<>]+/g)].map((m) => m[0].replace(/[.,;:!]+$/, ""));
  const seen = new Set();
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
    if (yt) { if (!out.embedUrl) out.embedUrl = `https://www.youtube.com/embed/${yt[1]}`; continue; }
    if (/\.(mp4|webm)(\?|$)/i.test(url)) { if (!out.videoUrl) out.videoUrl = url; continue; }
    if (/\.(png|jpe?g|svg|gif|webp)(\?|$)/i.test(url)) continue;     // images / badges
    if (/shields\.io|badgen|forthebadge|img\.shields/i.test(url)) continue;
    for (const r of config.linkRules) {
      if (url.toLowerCase().includes(r.match.toLowerCase())) {
        if (out.links.length < 3 && !out.links.some((l) => l.url === url)) out.links.push({ label: r.label, url });
        break;
      }
    }
  }
  return out;
}

// Free-text skill phrases (the README's "Skills Demonstrated" list) and inferred concepts get
// routed into readable, colour-coded buckets by keyword so they don't all pile into "Other".
// Order matters — first match wins, so the genuinely-hard buckets come before the lighter
// ones (e.g. "minimax" → Algorithms before "Game AI"; "3D"/OpenGL → 3D Graphics before 2D).
const CONCEPT_BUCKETS = [
  { name: "AI & ML",                  re: /machine learning|deep learning|neural network|computer vision|\bcnn\b|\bnlp\b|reinforcement learning|model (?:training|inference)|\binference\b|object detection|image (?:processing|classification|recognition)|classifier|pose estimation|gesture recognition|transformer/i },
  { name: "Algorithms & DS",          re: /algorithm|data structure|\bgraph\b|breadth-first|depth-first|\bsearch\b|recursion|combinator|state.?space|traversal|dynamic programming|minimax|alpha-?beta|pathfind|\ba\*|complexity|\boptimization|\bsolver\b/i },
  { name: "Concurrency & Networking", re: /thread|concurren|asynchron|parallel|producer.?consumer|mutex|synchroniz|background process|real-?time|network|socket|client.?server|multiplayer|\btcp\b|\budp\b|websocket|distributed/i },
  { name: "3D Graphics",              re: /\b3d\b|opengl|webgl|vulkan|\bshader|raycast|ray-cast|rendering pipeline|physics engine|\bglsl\b/i },
  { name: "Systems & Embedded",       re: /robotics|embedded|firmware|microcontroller|arduino|raspberry pi|\brtos\b|\bros\b|sensor fusion|actuator|bare-metal|control system|device driver|\bkernel\b|\bsimd\b/i },
  { name: "Security & Crypto",        re: /cryptograph|encryption|aes-?\d|\brsa\b|hashing algorithm|penetration test|vulnerab|reverse engineer|openssl|libsodium|cybersecurity|\bsecurity\b/i },
  { name: "Compilers & Languages",    re: /compiler|interpreter|\blexer\b|tokeniz|bytecode|abstract syntax tree|\bllvm\b|\bantlr\b|parser combinator|recursive descent|\bast\b|type system/i },
  { name: "Distributed & Data",       re: /distributed (?:system|comput)|consensus|paxos|\braft\b|\bkafka\b|microservice|sharding|replication|\bgrpc\b|map-?reduce|query (?:engine|optimiz)/i },
  { name: "Game AI",                  re: /game ai|state.?machine|steering|enemy ai|behaviou?r tree|finite.?state|\bnpc\b|flocking|procedural generation/i },
  { name: "UI & 2D",                  re: /\b2d\b|sprite|tilemap|\bcanvas\b|\bgui\b|\bui\b|\bux\b|interaction design|material design|declarative|reactive state|animation|render(?:ing|er)?\b/i },
  { name: "Architecture & Design",    re: /object-?oriented|\boop\b|design pattern|\bpattern\b|architecture|\bmvvm\b|\bmvc\b|modular|encapsulat|abstraction|repository|observer|factory|singleton|state management|lifecycle|persistence|data model|\bnavigation\b|dependency injection|inheritance|polymorph/i },
  { name: "Testing & Delivery",       re: /\btest|debug|invariant|ci.?\/?cd|coverage|packaging|deploy|shipping|build system|cross-platform|devops/i },
];
function groupExhibitSkills(scan, domains) {
  const langs = scan.languages.slice(0, 6);
  const rest = [...new Set([...scan.skills, ...domains])];
  const known = new Set([...langs, ...Object.values(SKILL_CATEGORY).flat()]);
  const groups = [];
  const add = (category, items) => {
    const u = [...new Set(items)].filter(Boolean);
    if (u.length) groups.push({ category, items: u });
  };
  add("Languages", langs);
  // Objective tech — exact membership.
  for (const cat of ["Frameworks", "ML / Data", "Databases", "Tools"]) add(cat, rest.filter((s) => (SKILL_CATEGORY[cat] || []).includes(s)));
  // Inferred concepts + the README's curated phrases → keyword buckets; the rest is "Concepts & Practices".
  const conceptual = rest.filter((s) => !known.has(s) || (SKILL_CATEGORY.Concepts || []).includes(s));
  const bucketed = {};
  const leftover = [];
  for (const s of conceptual) {
    const b = CONCEPT_BUCKETS.find((bk) => bk.re.test(s));
    (b ? (bucketed[b.name] = bucketed[b.name] || []) : leftover).push(s);
  }
  for (const bk of CONCEPT_BUCKETS) add(bk.name, bucketed[bk.name] || []);
  add("Concepts & Practices", leftover);
  return groups;
}

function toExhibit(repo, scan, domains = []) {
  const ov = config.overrides[repo.name] || {};
  const description =
    ov.description || readmeDescription(scan.readme) || repo.description ||
    `A ${scan.languages[0] || "code"} project.`;
  // tech tags: top languages first, then every detected framework/tool/skill, deduped.
  // No cap — the card slices to a handful for layout; the popup shows the grouped `skills`.
  const tech = ov.tech || [...new Set([...scan.languages.slice(0, 4), ...scan.skills])];
  const skills = ov.skills || groupExhibitSkills(scan, domains);
  const media = extractMedia(scan.readme);
  const links = [{ label: "GitHub", url: repo.html_url }];
  if (repo.homepage) links.unshift({ label: "Live", url: repo.homepage });
  for (const l of media.links) if (!links.some((x) => x.url === l.url)) links.push(l);

  // Prefer a committed demo.mp4 (hotlinkable) over a README embed; the renderer uses
  // videoUrl ahead of embedUrl, so only fall back to a YouTube embed when there's no file.
  const videoUrl = ov.videoUrl || scan.videoUrl || media.videoUrl;
  const embedUrl = videoUrl ? undefined : (ov.embedUrl || media.embedUrl);

  const popup = {
    title: ov.title || humanize(repo.name),
    ...(ov.subtitle ? { subtitle: ov.subtitle } : {}),
    description,
    tech,
    ...(skills.length ? { skills } : {}),
    links,
    ...(videoUrl ? { videoUrl } : {}),
    ...(embedUrl ? { embedUrl } : {}),
  };
  return {
    _name: repo.name,
    _stars: repo.stargazers_count || 0,
    _pushed: repo.pushed_at,
    _featured: ov.featured ?? config.featured.includes(repo.name),
    _order: ov.order ?? null,
    _allSkills: scan.skills,
    popup,
  };
}

// Difficulty / significance score — decides which repos are "featured" (Main Hall)
// vs "archive". Personal repos rarely have stars, so we weigh project size, tech
// depth, a demo, whether it's deployed/published, and documentation instead.
// Concept areas (in popup.skills, grouped by CONCEPT_BUCKETS), tiered by genuine difficulty:
//   HARD   — real ML/CV, non-trivial algorithms, concurrency/networking, 3D graphics.
//   MEDIUM — Game AI (state machines / steering — NOT real ML) and UI / 2D rendering.
//   BASIC  — table-stakes engineering present in almost every project (OOP, tests/packaging).
const HARD_AREAS = ["AI & ML", "Algorithms & DS", "Concurrency & Networking", "3D Graphics", "Systems & Embedded", "Security & Crypto", "Compilers & Languages", "Distributed & Data"];
const MEDIUM_AREAS = ["Game AI", "UI & 2D"];
const BASIC_AREAS = ["Architecture & Design", "Testing & Delivery"];
const SYSTEMS_LANGS = new Set(["C", "C++", "Rust", "Assembly"]); // low-level langs signal harder engineering
// Engineering domains the concept buckets don't otherwise credit: backend/API and data work is
// substantive (and recruiter-relevant) but maps to no "hard" concept bucket, so a deep server/data/AI
// tool was scoring near-zero on difficulty for exactly the work that makes it strong. Credit it from
// the inferred domains. (Only domains with NO HARD/MEDIUM bucket are here — e.g. Security, Distributed
// and Compilers are deliberately omitted since their buckets already score them, to avoid double-count.)
const DOMAIN_DIFFICULTY = {
  "Backend / APIs": 3,
  "Data Analysis": 3,
  "Mobile Development": 2,
  "Automation / Scraping": 1.5,
};
// Domains we deliberately don't difficulty-score: ubiquitous (Web) or already credited through their
// sub-areas (a game's Game AI / Physics buckets). Listed so the coverage audit below stays silent on
// them — anything NOT here and NOT credited is a real gap and gets warned about.
const DIFFICULTY_LIGHT = new Set(["Web Development", "Game Development", "Game Physics"]);

// Guardrail against future scoring gaps: every domain in DOMAIN_RULES must earn difficulty credit
// either through a HARD/MEDIUM/BASIC concept bucket or an explicit DOMAIN_DIFFICULTY entry (or be
// marked intentionally-light). If someone adds a new domain later and forgets to weight it, this
// warns on the next sync so it never silently scores zero the way Backend/Data once did.
function auditDomainCoverage() {
  const credited = new Set([...HARD_AREAS, ...MEDIUM_AREAS, ...BASIC_AREAS]);
  const gaps = DOMAIN_RULES.map((r) => r.skill).filter((d) => {
    const bucket = CONCEPT_BUCKETS.find((b) => b.re.test(d));
    return !(bucket && credited.has(bucket.name)) && !(d in DOMAIN_DIFFICULTY) && !DIFFICULTY_LIGHT.has(d);
  });
  if (gaps.length) {
    console.warn(`\n  ⚠ Scoring gap — these domains earn no difficulty credit (add to DOMAIN_DIFFICULTY,\n    give them a concept bucket, or list them in DIFFICULTY_LIGHT): ${gaps.join(", ")}`);
  }
}
// Practice / exercise / learning collections — not portfolio projects, so they're discounted.
const COLLECTION_RE = /^learn|competitive.?program|leetcode|hackerrank|advent.?of.?code|\bkata\b|^exercis|playground|sandbox|boilerplate|\bstarter\b|\btemplate\b|coursework|^assignment|^notes$|cheat.?sheet|practice.?problem/i;
function significance(repo, scan, domains, popup) {
  const groups = popup.skills || [];
  const itemsIn = (cat) => groups.find((g) => g.category === cat)?.items.length || 0;
  const concepts = groups.filter((g) => g.category !== "Languages").reduce((s, g) => s + g.items.length, 0);
  // Difficulty — the dominant signal: HARD areas score most, MEDIUM (game AI / 2D) less, BASIC
  // (OOP / testing — table stakes) least, plus a small capped depth bonus.
  const difficulty =
    HARD_AREAS.filter((c) => itemsIn(c) > 0).length * 6 +
    MEDIUM_AREAS.filter((c) => itemsIn(c) > 0).length * 3 +
    BASIC_AREAS.filter((c) => itemsIn(c) > 0).length * 1.5 +
    Math.min(concepts, 18) * 0.3 +
    (domains || []).reduce((s, d) => s + (DOMAIN_DIFFICULTY[d] || 0), 0);  // backend/data/mobile/scraping
  // Scope — code actually written (language bytes, NOT repo.size which is inflated by videos).
  const scope = Math.log2((scan.codeBytes || 0) / 1024 + 1) * 1.8;
  const breadth = scan.languages.length * 1.5 + scan.languages.filter((l) => SYSTEMS_LANGS.has(l)).length * 2; // polyglot + low-level bonus
  // Shipped — a published app / live site is the strongest recruiter signal; a package, less so.
  const links = popup.links || [];
  const deployed = links.some((l) => /google play|app store|live|chrome web|marketplace|devpost/i.test(l.label)) ? 14
    : links.some((l) => /\bnpm\b|pypi/i.test(l.label)) ? 7 : 0;
  const social = (repo.stargazers_count || 0) * 6 + (repo.forks_count || 0) * 3;
  const collab = scan.multiContributor ? 4 : 0;
  // Polish — small: README length is gameable and a demo is near-universal.
  const polish = Math.min((scan.readme || "").length / 900, 4) + ((popup.videoUrl || popup.embedUrl) ? 2 : 0);
  const coll = COLLECTION_RE.test(repo.name);
  const sub = difficulty + scope + breadth + deployed + social + collab + polish;
  return { total: coll ? sub * 0.5 : sub, parts: { difficulty, scope, breadth, deployed, social, collab, polish, coll } };
}

function groupSkills(allSkills, allLanguages, soft) {
  const langs = [...new Set(allLanguages)].slice(0, 12);
  // Aggregate view: keep only canonical *detected* skills. The per-repo README free-text
  // phrasings are dropped here — across repos they duplicate the same skill reworded
  // ("Object-oriented design" / "OOP" / "Object-oriented programming"). The detailed phrases
  // still appear, grouped, inside each project's own popup.
  const canon = new Set(KNOWN_SKILLS);
  const have = new Set([...allSkills].filter((s) => canon.has(s)));
  const groups = [];
  const push = (title, items, description) => {
    const uniq = [...new Set(items)].filter(Boolean);
    if (uniq.length) groups.push({ popup: { title, ...(description ? { description } : {}), tech: uniq } });
  };

  push("Languages", langs, "Languages across my repositories, by usage.");
  for (const [cat, members] of Object.entries(SKILL_CATEGORY)) {
    push(cat, members.filter((m) => have.has(m)));
  }
  if (soft?.length) push("Soft Skills", soft);
  // Canonical but uncategorised (e.g. Tokio, Gson) — small.
  const known = new Set([...langs, ...Object.values(SKILL_CATEGORY).flat()]);
  push("More", [...have].filter((s) => !known.has(s)));
  return groups;
}

function ser(v) { return JSON.stringify(v, null, 2).replace(/\n/g, "\n"); }

async function main() {
  console.log(`Syncing github.com/${config.username}${TOKEN ? " (authenticated)" : " (unauthenticated — limited)"}…`);

  // Fetch all repos (paginated).
  const repos = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh(`/users/${config.username}/repos?per_page=100&page=${page}&sort=updated&type=owner`);
    if (!batch?.length) break;
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  // Filter.
  const kept = repos.filter((r) => {
    if (ignored(r.name)) return false;
    if (config.overrides[r.name]?.hidden) return false;
    if (config.skipForks && r.fork) return false;
    if (config.skipArchived && r.archived) return false;
    if (config.skipNoDescriptionAndNoStars && !r.description && !r.stargazers_count) return false;
    return true;
  });
  console.log(`  ${repos.length} repos found, ${kept.length} after filtering.`);

  // Scan each.
  const exhibits = [];
  const allLanguages = [];
  const allSkills = [];
  const videoQueue = [];
  let collaborative = 0;
  let documented = 0;
  for (const repo of kept) {
    let scan = { languages: [], skills: [], readme: "", multiContributor: false };
    try { scan = await scanRepo(repo); }
    catch (e) { if (e.message === "RATE_LIMIT") { console.warn(`  ⚠ rate limit reached at ${repo.name} — remaining repos get a light scan.`); } else throw e; }
    const domains = inferDomains(repo, scan);
    allLanguages.push(...scan.languages);
    allSkills.push(...scan.skills, ...domains);
    if (scan.multiContributor) collaborative++;
    if ((scan.readme || "").length > 400) documented++;
    // Self-host only small demos; bigger ones keep the README's YouTube embed (left intact
    // because we never set scan.videoUrl for them). LFS pointers report tiny here, so they
    // get queued and the downloader confirms/skips them against the real size.
    let videoFile = null;
    if (scan.videoRawUrl && scan.videoSize <= SELF_HOST_MAX) {
      videoFile = `${repo.name}.${scan.videoExt}`;
      scan.videoUrl = `/videos/${videoFile}`; // optimistic; the parallel pass below confirms it
    }
    const exhibit = toExhibit(repo, scan, domains);
    const sig = significance(repo, scan, domains, exhibit.popup);
    exhibit._score = sig.total;
    exhibit._sig = sig.parts;
    exhibits.push(exhibit);
    if (videoFile) {
      const embedFallback = config.overrides[repo.name]?.embedUrl || extractMedia(scan.readme).embedUrl;
      videoQueue.push({ url: scan.videoRawUrl, dest: path.join(VIDEO_DIR, videoFile), popup: exhibit.popup, embedFallback });
    }
    const usesEmbed = !videoFile && (config.overrides[repo.name]?.embedUrl || extractMedia(scan.readme).embedUrl);
    console.log(`  · ${repo.name}: ${scan.languages[0] || "?"}${scan.skills.length ? " + " + scan.skills.length + " skills" : ""}${domains.length ? " · " + domains.join(", ") : ""}${videoFile ? " · video" : usesEmbed ? " · youtube" : ""}`);
  }

  // Demo videos download in parallel (raw GitHub throttles each connection hard).
  if (videoQueue.length) {
    console.log(`  Downloading ${videoQueue.length} demo videos…`);
    await downloadVideos(videoQueue);
  }

  // Soft skills: your curated list + a couple of evidence-based ones.
  const soft = [...config.softSkills];
  if (config.inferSoftSkills) {
    if (collaborative > 0 && !soft.includes("Collaboration")) soft.push("Collaboration");
    if (documented >= 3 && !soft.includes("Technical Writing")) soft.push("Technical Writing");
  }

  // Featured vs archive — by a score THRESHOLD (not a fixed count). Repos scoring at or above
  // config.featuredThreshold go to Projects; the rest to Archive. Tune the threshold using the
  // ranking printed below.
  const byScore = [...exhibits].sort((a, b) => b._score - a._score);
  const threshold = config.featuredThreshold ?? 30;
  const isFeatured = (e) => e._featured || e._score >= threshold;

  // Flag any domain that would score zero difficulty (so future taxonomy additions can't silently
  // recreate the Backend/Data gap).
  auditDomainCoverage();

  // Show the ranking + score breakdown so it's clear why each repo landed where.
  console.log(`\n  Significance ranking (score ≥ ${threshold} → Projects, else Archive):`);
  console.log(`  ${"".padEnd(24)} score │ diffic scope brdth deploy social collab polish`);
  for (const e of byScore) {
    const p = e._sig || {};
    const tag = isFeatured(e) ? "★" : " ";
    console.log(
      `  ${tag} ${e._name.slice(0, 22).padEnd(22)} ${e._score.toFixed(1).padStart(5)} │ ` +
      `${p.difficulty.toFixed(1).padStart(6)} ${p.scope.toFixed(1).padStart(5)} ${String(p.breadth).padStart(5)} ` +
      `${String(p.deployed).padStart(6)} ${String(p.social).padStart(6)} ${String(p.collab).padStart(6)} ${p.polish.toFixed(1).padStart(6)}` +
      `${p.coll ? "  ½ collection" : ""}`,
    );
  }
  console.log("");

  const order = (a, b) => {
    if (a._order != null && b._order != null) return a._order - b._order;
    if (a._order != null) return -1;
    if (b._order != null) return 1;
    return b._score - a._score; // most significant first
  };
  const strip = (e) => ({ popup: e.popup });
  const mainHall = exhibits.filter(isFeatured).sort(order).map(strip);
  const archive = exhibits.filter((e) => !isFeatured(e)).sort(order).map(strip);
  const skills = groupSkills(allSkills, allLanguages, soft);

  const banner = `// ⚠ AUTO-GENERATED by scripts/sync-github.mjs — do not edit by hand.\n// Run \`npm run sync:github\` (or let the scheduled GitHub Action) to regenerate.\n`;
  const body =
    `${banner}import type { Exhibit } from "./projects";\n\n` +
    `export const generatedMainHall: Exhibit[] = ${ser(mainHall)};\n\n` +
    `export const generatedArchive: Exhibit[] = ${ser(archive)};\n\n` +
    `export const generatedSkills: Exhibit[] = ${ser(skills)};\n\n` +
    `export const generatedMeta = ${ser({ username: config.username, repoCount: kept.length, syncedAt: new Date().toISOString() })};\n`;

  fs.writeFileSync(OUT, body);
  console.log(`✓ Wrote ${path.relative(path.join(__dirname, ".."), OUT)} — ${mainHall.length} featured, ${archive.length} archived, ${skills.length} skill groups.`);
}

main().catch((e) => { console.error("✗ sync failed:", e.message); process.exit(1); });
