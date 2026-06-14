# Museum Portfolio

An interactive personal portfolio with two faces: a fast, content-first **web portfolio** at `/`, and a lazy-loaded **pixel-art museum game** you can step into — built on a custom **HTML5 Canvas game engine** with a 60fps `requestAnimationFrame` loop, **tile-based AABB collision**, **A\* pathfinding**, **particle systems**, and a **procedurally generated** map. Walk a character through auto-built themed rooms and open exhibits showcasing projects, skills, experience, and contact info; both faces render from a single content source.

Other visitors drift through the museum as warm glowing **"ghost" wisps** — a lightweight **multiplayer-presence** feature that records anonymous movement paths and replays them with their own exhibit-visiting AI. Project, skills, and competitive-programming data (GitHub, LeetCode, DMOJ) **refreshes automatically** through a daily **GitHub Actions** pipeline. Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Upstash Redis**.

## Features

- **Dual experience** — a fast static web portfolio and an explorable canvas museum, both driven by one `projects.ts` content source (edit once, both update).
- **Seamless portal** — a continuous camera-pan transition hands off from the DOM site into the game and back, with a `prefers-reduced-motion` crossfade fallback.
- **Explorable museum** — move with WASD / arrow keys / click-to-move / an on-screen touch joystick; press **E** to inspect glowing exhibits.
- **Ghost trails (multiplayer presence)** — other visitors appear as drifting wisps that wander between exhibits and linger to "view" them; their paths are recorded, stored, and replayed back to future visitors.
- **Live, self-updating content** — GitHub repos populate Projects + Skills and LeetCode/DMOJ stats populate a competitive-programming panel — all refreshed daily, no manual edits.
- **Dynamic documents** — résumé and transcript PDFs are parsed on the fly into structured, themed popups.
- **Atmosphere** — a slow golden-hour day/night colour wash, ambient dust, footstep audio, a live minimap, and a hidden easter egg.

## How It Works

**Engine ↔ React split.** A standalone canvas `GameEngine` runs the 60fps game loop and never imports React; it talks to the UI only through an `onEvent` callback. The web portfolio (`SiteShell` / `Portfolio`) is server-rendered for instant load, and the heavier `GameCanvas` is lazy-mounted only once a visitor steps inside.

**Rendering & world.** The scene draws in three y-sorted passes (floor/walls → entities → glow) for a top-down 2.5D depth effect — entities further south draw last and appear in front. The whole museum map (rooms, doorways, perimeter walls) is **procedurally generated** from a list of branch definitions, so adding a room is one array entry. Movement uses **tile-based AABB collision detection** decoupled from tile type (sprites can overhang their tiles), and click-to-move / minimap taps run **A\* pathfinding** — 8-directional with diagonal corner-cut prevention and a line-of-sight string-pulling smoothing pass.

**Ghost trails.** The engine samples the player's path; on leave it's `POST`ed to a route handler and stored in **Redis** (Upstash REST API) as a capped, trimmed list. New visitors fetch the recent paths and a `GhostSystem` replays them as additive-blended **particle** wisps that pathfind between exhibits, respect collisions, hover, and never revisit the same one — degrading gracefully to fully procedural wanderers when the store is empty or unconfigured.

**Data pipeline.** A daily **GitHub Actions** cron scans the owner's repos (languages, dependency manifests, READMEs, demo videos) and fetches LeetCode (GraphQL) + DMOJ stats, committing them as static data the site reads — so the live site never makes those third-party calls at runtime. A CI workflow gates every PR on `tsc` + lint + tests, and Dependabot keeps dependencies current.

## Skills Demonstrated

- Game engine architecture — a decoupled 60fps `requestAnimationFrame` game loop with fixed delta-time updates, kept entirely separate from React
- HTML5 Canvas rendering — a three-pass, y-sorted scene draw for top-down 2.5D depth sorting
- Collision detection & physics — tile-based AABB resolution with per-axis wall sliding, decoupled from tile type
- A\* pathfinding — 8-directional grid search with diagonal corner-cut prevention and string-pulled path smoothing (click-to-move and ghost navigation)
- Particle systems — a pooled effects system for dust, footsteps, sparkles, and additive-blended "wisp" particles
- Procedural generation — the museum map (rooms, doorways, walls) auto-derived from branch definitions via an adjacency wall-stamping pass
- Multiplayer presence — visitor movement paths recorded, persisted, and replayed as autonomous "ghost" wisps driven by an exhibit-visiting state machine
- Real-time animation — sprite walk cycles, eased camera follow, hover/bob motion, and a breathing additive glow
- React and Next.js (App Router) — a server-rendered web portfolio with a seamless camera-pan handoff into the lazy-loaded canvas game
- REST API and route handlers — dynamic endpoints for ghost storage and on-the-fly PDF parsing
- Redis with Upstash REST API — append-and-trim list storage for visitor paths, with per-IP rate limiting and graceful degradation
- External API integration — LeetCode GraphQL, the DMOJ API, and the GitHub REST API normalized into static site data
- CI/CD and automation — a scheduled GitHub Actions cron that syncs project/skills/stats data and commits it, plus a CI test gate and Dependabot
- PDF parsing — résumé and transcript PDFs extracted into structured data with the pdf-parse library
- Accessibility and performance — `prefers-reduced-motion` handling, a lazy-loaded game bundle, and daily CDN caching
- TypeScript — a fully typed engine and React application end to end

## Tech Stack

- TypeScript, Next.js 16 (App Router), React 19
- HTML5 Canvas (game rendering), Tailwind CSS 4
- Framer Motion (popup animation), Howler.js (audio)
- Upstash Redis (REST API) for ghost-trail storage
- Node.js sync scripts, GitHub Actions, Dependabot
- pdf-parse (résumé / transcript parsing), Vercel (hosting, Web Analytics, Speed Insights)
- LeetCode GraphQL API, DMOJ API, GitHub REST API
- Aseprite / LibreSprite (pixel-art sprites)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The web portfolio loads first; click **Step inside** to enter the museum. Move with **WASD** / **arrow keys** (or click-to-move / the touch joystick), press **E** or **Enter** near a glowing pedestal to open it, and **Esc** to close.

> **Deploying?** Ghost trails need two Upstash Redis env vars and the data sync runs on a GitHub Action — see [Live Data, Deployment & Environment](#live-data-deployment--environment) below.

---

## Vision & Aesthetic

The portfolio should feel like wandering into a well-loved private library at golden hour — cozy, serene, and personal. Think warm wood paneling, bookshelves, soft lamplight, worn rugs. A lo-fi playlist playing in another room. The kind of space that feels lived-in and reflects the owner's personality, not a cold public institution.

**Mood:** cozy · serene · lo-fi · home library / mansion · personal  
**Not:** dark · edgy · cold · corporate · cyberpunk

### Color palette

Colors are defined in [`src/styles/theme.ts`](src/styles/theme.ts) and surfaced as Tailwind tokens (`parchment`, `pine`, `walnut`, `sage`, etc.) in `globals.css`. The overlay components under `src/components/overlays/` consume these tokens exclusively — no hardcoded hex values.

| Role | Value | Description |
|------|-------|-------------|
| Canvas background | `#1c1508` | Deep warm walnut — shows through VOID tiles outside the museum |
| Floor | `#c9a87c` | Warm honey wood parquet |
| Wall | `#ddd0b3` | Warm cream plaster |
| Door | `#7a4f2a` | Warm mahogany threshold |
| Accent | `#7a9e7e` | Soft sage green — interactive highlights, player, glow |
| Popup background | `#fef9ec` | Warm parchment |
| Text | `#3a2e1e` | Warm dark brown |
| Text (accent) | `#4a7a44` | Deep sage — titles and tags |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      REACT LAYER                          │
│  Portfolio (web) ── lazy ──▶ GameCanvas ◀─ engine events  │
│  overlays/{ExhibitOverlay,ResumePopup,TranscriptPopup}    │
│  Minimap · DialogBox · ControlsHint · LoadingScreen       │
└────────────────────────┬─────────────────────────────────┘
                         │ events: nearby / interact / leave / idle / active
┌────────────────────────┴─────────────────────────────────┐
│                   GAME ENGINE LAYER                       │
│  engine.ts     → orchestration: 60fps loop, events        │
│   ├ player.ts      movement · facing · animation          │
│   ├ collision.ts   tile AABB resolution                   │
│   ├ particles.ts   dust / footstep / sparkle / wisp pool  │
│   ├ ghosts.ts      visitor-path replay + exhibit-visit AI │
│   ├ pathfinding.ts A* grid search + string-pulling        │
│   ├ sprites.ts     sprite loading + readiness             │
│   └ renderer.ts    3-pass y-sorted scene draw             │
│  input.ts · camera.ts · tilemap.ts · interactables.ts     │
└──────────────────────────────────────────────────────────┘
```

**Key principle:** the game engine never imports React. They communicate only through the `onEvent` callback on `GameEngine`, which keeps the 60fps loop fast and the React tree clean.

## Project Structure

```
src/
├── app/                Next.js App Router
│   ├── api/            route handlers — resume/transcript PDF parsing, ghost storage, .jar proxy
│   ├── map-snapshot/   dev tool — renders the full museum to a canvas with PNG export
│   └── opengraph-image.tsx   generated social share card
├── components/
│   ├── site/           the web portfolio — Hero, Projects, Experience, Skills, Contact, nav
│   ├── overlays/        in-game popups — ExhibitOverlay, ResumePopup, TranscriptPopup
│   └── GameCanvas, Minimap, DialogBox, ControlsHint, LoadingScreen, CpStats
├── game/               the canvas engine (never imports React) — see table below
├── data/               projects.ts (hand-written content) + generated GitHub / CP-stats data
├── styles/             theme.ts design tokens (mirrored as Tailwind tokens in globals.css)
└── types/              shared API response types, imported by both route and client
```

### The engine (`src/game/`)

`engine.ts` is orchestration only; the real work is split into focused modules.

| File | Purpose |
|------|---------|
| `engine.ts` | 60fps loop, update tick, interaction events, ambient blink/flicker, public API (`onReady`, `setPaused`, `start`/`stop`) |
| `player.ts` | Player state, movement with per-axis collision, facing, walk/idle animation |
| `collision.ts` | Tile-based AABB resolution (`isSolid`, `resolveCollisionX/Y`) over a rect |
| `pathfinding.ts` | 8-directional A\* with corner-cut prevention + line-of-sight string-pulling (click-to-move, ghost nav) |
| `particles.ts` | Pooled particle system — dust, footsteps, sparkles, additive-blended wisps |
| `ghosts.ts` | `GhostSystem` — replays recorded visitor paths as wisps driven by an exhibit-visiting state machine |
| `sprites.ts` | `SpriteRegistry` — loads every sprite, tracks readiness, fires `onReady` |
| `renderer.ts` | `drawScene()` — 3-pass y-sorted render (floor/wall → entities → glow/dust) |
| `input.ts` | Held-key tracking via a `Set` |
| `camera.ts` | `snapTo()` on load + smooth `follow()` each frame |
| `tilemap.ts` | Procedural map builder, object/solid layers, exported maps + `branchLabels` |
| `tile-ids.ts` | `TILES` constant — all tile ID definitions |
| `interactables.ts` | Auto-scans the map for interactable tiles and links each to its exhibit |

All exhibit content lives in [`src/data/projects.ts`](src/data/projects.ts) — **the one file to edit for content.** The `mainHall`, `archive`, and `skills` arrays are re-exported from `github.generated.ts` and refreshed by the daily sync, so don't hand-edit those (use the sync config's `overrides` instead); the rest (`experience`, `office`, `giftShop`, `resume`, `easterEgg`) are hand-written. See [`src/data/ADDING_EXHIBITS.md`](src/data/ADDING_EXHIBITS.md).

---

## The Museum Map

```
North (top)
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │ Experience│    │ Projects  │    │  Archive  │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
══════════╪════════════════╪════════════════╪═════════════════╗
 ★  [R]   │                │                │            desk ║  hallway
══════════╪══════════╪═════╪══════════╪═════╪═════════════════╝
                     │                │
               ┌─────┴─────┐    ┌─────┴─────┐
               │  About Me │    │   Links   │
               └───────────┘    └───────────┘
South (bottom)

★   = Easter egg — hidden far-left of the hallway, looks like plain floor
[R] = Resume pedestal — 1 tile north, 2 tiles right of player spawn
desk = right-margin alcove (7 tiles wide) — the "me at my desk" character
```

Room sizes are **not** fixed — each branch auto-sizes to the number of exhibits in its array (Projects/Archive grow as repos are synced). Tile IDs encode which exhibit array to pull from; the scanner in `interactables.ts` reads them top→bottom, left→right and assigns the matching exhibit from `roomRegistry`.

### How the map is built (`tilemap.ts`)

`buildMap()` derives every dimension from the branch definition arrays. **To add a branch pair**, append one entry to both `northBranches` and `southBranches` — map width, hallway fill, doorways, interiors, and exhibit placement all update automatically.

```ts
const northBranches: BranchDef[] = [
  { tile: TILES.EXPERIENCE, count: experienceExhibits.length, label: "Experience" },
  { tile: TILES.MAIN_HALL,  count: mainHallExhibits.length,  label: "Projects" },
  { tile: TILES.ARCHIVE,    count: archiveExhibits.length,   label: "Archive" },
];

const southBranches: BranchDef[] = [
  { tile: TILES.OFFICE,    count: officeExhibits.length,    label: "About Me" },
  { tile: TILES.GIFT_SHOP, count: giftShopExhibits.length,  label: "Links" },
];
```

Build steps inside `buildMap()`: init all cells to `VOID` → carve the hallway floor → carve 5-tile doorways → for each branch carve interior floor and stamp exhibit tiles → place the resume tile and easter egg → run a snapshot-based **adjacency pass** (any `VOID` tile 8-adjacent to a non-`VOID` tile becomes `WALL`), which produces exactly one tile of wall around every room and leaves the museum silhouette — not a rectangle.

### Three map layers

Three arrays exported from `tilemap.ts` — read from these, never reconstruct them:

| Export | Type | Purpose |
|--------|------|---------|
| `museumMap` | `number[][]` | Tile IDs (floor/wall/interactable). Drives the interaction system. |
| `objectMap` | `(number\|null)[][]` | Furniture layer. `null` = empty. Drawn above floor, y-sorted vs the player. |
| `solidMap` | `boolean[][]` | `true` = impassable. Decoupled from tile type so sprites can overhang their tiles. |

Interactable tiles are walkable — the player stands **behind** them (north), and `solidMap` marks the tile one row **south** of each pedestal solid, which is what creates the "walk behind the exhibit" depth effect.

---

## Rendering Pipeline (`renderer.ts`)

Three passes per frame produce the top-down 2.5D look:

1. **Floor & walls** — iterate visible tiles; `VOID` is skipped (the background shows through), everything else draws its tile sprite / fill.
2. **Y-sorted entities** — iterate sort rows north→south; each entity (player, pedestals, furniture) draws when its sort key matches the current row. An entity further south has a higher sort key and draws later, so it appears in front. The glow for a nearby interactable is drawn in this pass, behind its object but above the floor.
3. *(folded into pass 2 — glow is no longer a separate pass)*

This is why standing north of a pedestal renders it on top of you (you're "behind" it), and standing south renders you on top.

## Data Flow (interaction)

```
1. Player walks near an interactable tile
   └→ interactables.ts: getNearbyInteractable() finds a match within a 2-tile radius
2. Engine emits { type: "nearby", content: exhibit }
   └→ GameCanvas shows the DialogBox ("Press E to inspect")
3. Player presses E
   └→ Engine emits { type: "interact", content: exhibit }
   └→ GameCanvas: exhibit.audio → Howl(src).play();  exhibit.popup → open popup + engine.setPaused(true)
4. Player presses Esc / clicks the backdrop
   └→ close popup, engine.setPaused(false)
5. Player walks away
   └→ Engine emits { type: "leave" } → GameCanvas hides the DialogBox
```

---

## Adding & Editing Content

All exhibit content lives in [`src/data/projects.ts`](src/data/projects.ts) as plain arrays of `Exhibit` objects. Each room is one array; drop an entry in and it appears in both the web portfolio and the game.

```ts
// Text + links
{ popup: { title: "My Project", description: "Built this.", tech: ["React", "TypeScript"],
           links: [{ label: "GitHub", url: "https://github.com/you/project" }] } }

// Playable iframe embed
{ popup: { title: "My Game", embedUrl: "https://my-game.example.com", width: "900px", height: "650px" } }

// Audio only (easter egg)
{ audio: "/assets/audio/quack.mp3" }
```

| Array | Branch | Source |
|-------|--------|--------|
| `experienceExhibits` | Experience (north left) | hand-written |
| `mainHallExhibits` | Projects (north center) | auto-generated from GitHub |
| `archiveExhibits` | Archive (north right) | auto-generated from GitHub |
| `officeExhibits` | About Me (south left) | hand-written |
| `giftShopExhibits` | Links (south right) | hand-written |
| `skillsExhibits` | Skills wing | auto-generated from GitHub |
| `resumeExhibit` | Hallway pedestal | hand-written |
| `easterEggExhibits` | Hidden in the hallway | hand-written |

**To add a whole new room type:** add a `TILES` constant (next free ID) and put it in `INTERACTABLE_TILES` (keep the explicit `Set<number>` annotation — TypeScript otherwise narrows it to a literal union and breaks `.has()`); add a `TILE_COLORS` entry; append a branch to `northBranches` / `southBranches` with a `count`; create the exhibit array and register it in `roomRegistry`. North and south can differ in length — the shorter side is centered between the longer side's branches.

---

## API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/resume` | Reads the newest PDF in `public/assets/resume/`, parses it with `pdf-parse` into structured `ResumeData`, returns JSON. `force-dynamic`, so swapping the PDF needs no rebuild. |
| `GET /api/transcript` | Same pattern for `public/assets/transcript/` — parses courses into subject groups. |
| `GET /api/jar/[...slug]` | Proxy for playable `.jar` demos. `slug[0]` is a **base64url-encoded** URL; only `https://github.com/<owner>/<repo>/releases/download/…` is allowed (else 403). Forwards `Range` headers so the in-browser Java runner can stream the archive. |
| `GET` · `POST /api/ghosts` | Anonymous visitor movement paths for the ghost wisps. `POST` validates + per-IP rate-limits a path and stores it; `GET` returns the most-recent paths (CDN-cached daily). Backed by **Upstash Redis**; **degrades to procedural wisps** when Upstash isn't configured. |

Response types live in [`src/types/`](src/types/) and are shared by each route and its client component, so client code never imports from a server `route.ts`. Competitive-programming stats and GitHub projects are **not** runtime routes — they're synced to static files by the daily GitHub Action (below).

## Live Data, Deployment & Environment

### Environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `UPSTASH_REDIS_REST_URL` | server-only (Vercel + local `.env`) | Upstash Redis REST endpoint for ghost-trail storage. **Without it, ghosts fall back to procedural wisps** — the site still works. |
| `UPSTASH_REDIS_REST_TOKEN` | server-only | Auth token for the above. **Never** prefix either with `NEXT_PUBLIC_`. In the Vercel dashboard, paste values **without** surrounding quotes. |
| `GH_TOKEN` | local only | Lifts the GitHub API rate limit for `npm run sync:github` locally. The scheduled Action uses the built-in `GITHUB_TOKEN` and needs no secret. |

### Daily data sync (GitHub Action)

`.github/workflows/sync-github.yml` runs daily (and on demand via "Run workflow"), committing refreshed data so the live site reads it statically and never calls these APIs at runtime:

- `npm run sync:github` → scans repos → `src/data/github.generated.ts` (Projects + Skills).
- `npm run sync:cp-stats` → LeetCode + DMOJ → `src/data/cp-stats.generated.json` (with last-good fallback so a transient block never wipes the numbers).

Both run from GitHub's IPs rather than the deployment's, sidestepping the Cloudflare bot-blocking LeetCode applies to datacenter IPs. See [`scripts/GITHUB_SYNC.md`](scripts/GITHUB_SYNC.md) for the tunable knobs.

### CI & dependencies

- `.github/workflows/ci.yml` gates every PR (and pushes to `main`) on **typecheck + lint + tests**.
- `.github/dependabot.yml` opens weekly batched update PRs; enable **Dependabot alerts + security updates** in repo Settings for advisory PRs.

### Deploying to Vercel

Import the repo (root directory = default), add the two `UPSTASH_*` vars for Production (unquoted, no `NEXT_PUBLIC_`), and deploy — the app degrades gracefully without them. Vercel Web Analytics + Speed Insights are wired in `layout.tsx`; enable them in the project dashboard.

---

## Key Design Decisions

**Canvas over DOM for the game** — DOM manipulation at 60fps causes GC pauses and layout thrashing. A single canvas draw surface gives predictable performance.

**Engine decoupled from React** — the loop runs 60×/second. Keeping it free of React means the engine stays fast and the React tree stays clean; they meet only at the `onEvent` boundary.

**Auto-scanned interactables** — hardcoded positions break every time the map changes. Scanning the grid means you place a tile, add an exhibit, done.

**Procedurally generated map** — branch count drives map width; branch depth drives floor carving. Adding a room is one array entry, and rooms resize themselves as content syncs in.

**`solidMap` decoupled from tile type** — top-down 2.5D sprites extend above their tile bounds, so collision can't be tied to visual tile identity. A plain `boolean[][]` can be shaped independently.

**Y-sort for depth** — objects further south draw last and appear in front; one row of offset between an interactable tile and its pedestal physics creates the illusion of walking behind the exhibit.

**Static data over runtime fetches** — GitHub/LeetCode/DMOJ data is synced to committed files by a daily Action, so the live site never makes third-party calls at request time (faster, and immune to the datacenter-IP blocking LeetCode applies).
