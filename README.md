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

### Sprite direction

When pixel art is created, it should reinforce the cozy library/mansion aesthetic:
- Warm wood floor tiles with subtle grain variation
- Cream plaster walls with a baseboard/wainscoting detail
- Pedestals as warm wood or stone columns
- Soft ambient lighting — warm golden cone overhead, not harsh neon
- Player character with a cozy aesthetic (warm-toned outfit, not a sci-fi suit)
- "Me at my desk" character should look natural and relaxed, not posed
- Plants, rugs, bookshelves, and lamps as furniture to reinforce the home-library feel

---

## For Claude Code / AI Assistants

Read this section first when picking up a new session.

### Current state (as of last update)

- Game engine runs: canvas renders at 60fps, player moves, smooth-lerp camera follows, collision works.
- Player is 56×56 px, spawns at the leftmost branch center column, hallway center row + 1.
- Map is **auto-generated** — width and height are computed from branch definitions. Do not hardcode dimensions anywhere.
- Three rendering layers: **floor/wall** (pass 1) → **player + objects y-sorted** (pass 2) → **glow** (on top).
- Objects (`objectMap`) are rendered above the floor and y-sorted against the player for a 3D depth effect.
- Collision is driven by `solidMap` (a `boolean[][]`), which is independent of tile type — allows sprites to extend beyond their tile bounds.
- VOID tiles surround the museum; the map silhouette is the museum shape, not a rectangle.
- Interactable tiles glow and show a dialog prompt. Pressing **E** opens a popup.
- A standalone **Resume pedestal** sits in the main hallway, one tile north and two tiles right of player spawn.
- The far-right margin of the hallway is a **desk alcove** (7 tiles wide) — floor space reserved for a desk sprite and "me at my desk" character.
- Camera snaps to player on load (no pan from top-left).
- **Minimap** renders in the bottom-right corner — player-centered, pre-rendered static base, active branch label highlighted.
- **ControlsHint** fades in on load and disappears after the player first moves.
- **LoadingScreen** covers the canvas until assets are ready, then fades out.
- `TILES` constants are defined in `tile-ids.ts` (extracted from `tilemap.ts`).

### What is stubbed / needs implementation

| File | Status | What it needs |
|------|--------|---------------|
| `src/components/HUD.tsx` | Documented stub | Room-name title shown on room entry (the Minimap already surfaces the active branch label) |
| `projects.ts` | Wired, placeholder content | Real project URLs, descriptions, experience entries, contact links |
| `public/assets/audio/quack.mp3` | **Missing file** | Easter-egg audio referenced by `projects.ts` — until it's added the easter egg 404s. (Ambient music, `footstep.wav`, and `interact.wav` are present.) |

> `player.ts` and `collision.ts` are **no longer stubs** — the engine split moved real
> logic into them. See the File Map below.

### Map Snapshot (`/map-snapshot`)

A developer-only page that renders the full museum map to a canvas for inspection and download.

- Loads a headless `GameEngine` (1×1 dummy canvas, no game loop) with cache-busting sprite URLs (`?v=<timestamp>`) so every page refresh fetches fresh sprite files from disk, bypassing the browser cache.
- `onReady` fires only after **all** tracked sprites have loaded (see sprite loading below), so `renderFull` always draws a complete scene.
- The **Download PNG** button re-renders the canvas fresh before exporting, so any runtime tilemap changes are captured.
- Cache-busting is opt-in — the main game passes no `cacheBust` argument so sprites load from the browser cache normally.

### Known constraints

- **Never run `npm audit fix --force`** — it force-downgrades `next` to 9.x and breaks the build. `next` is pinned to the patched 16.2.x line (the high-severity App Router advisory is fixed); the remaining moderate PostCSS advisories are transitive through Next, build-time only, and not reachable at runtime here. They clear when Next bumps its bundled postcss — Dependabot will surface that.
- `INTERACTABLE_TILES` must be typed `Set<number>` explicitly — TypeScript narrows the inferred type to a literal union, breaking `.has(number)`.
- Map dimensions are auto-computed from `northBranches` / `southBranches` arrays in `tilemap.ts`. Never hardcode `ROWS` or `COLS` elsewhere.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      REACT LAYER                          │
│  GameCanvas.tsx ← listens for engine events               │
│  overlays/{ExhibitOverlay,ResumePopup,TranscriptPopup}    │
│  Minimap · DialogBox · ControlsHint · LoadingScreen       │
└────────────────────────┬─────────────────────────────────┘
                         │ events: nearby / interact / leave / idle / active
┌────────────────────────┴─────────────────────────────────┐
│                   GAME ENGINE LAYER                       │
│  engine.ts     → orchestration: 60fps loop, events        │
│   ├ player.ts      movement · facing · animation          │
│   ├ collision.ts   tile AABB resolution                   │
│   ├ particles.ts   dust / footstep / sparkle pool         │
│   ├ sprites.ts     sprite loading + readiness             │
│   └ renderer.ts    3-pass y-sorted scene draw             │
│  input.ts · camera.ts · tilemap.ts · interactables.ts     │
└──────────────────────────────────────────────────────────┘
```

**Key principle:** the game engine never imports React. They communicate only through the `onEvent` callback on `GameEngine`.

---

## File Map

### `/src/game/`

The engine is split into focused modules; `engine.ts` is now orchestration only.

| File | Status | Purpose |
|------|--------|---------|
| `engine.ts` | ✅ | Orchestration: 60fps loop, update tick, interaction events, ambient blink/flicker, public API |
| `player.ts` | ✅ | Player state, movement (with per-axis collision), facing, walk/idle animation; `Direction` + anim constants |
| `collision.ts` | ✅ | Tile-based AABB resolution (`isSolid`, `resolveCollisionX/Y`) over a rect |
| `particles.ts` | ✅ | `ParticleSystem` — dust / footstep / sparkle pool (spawn · update · draw) |
| `sprites.ts` | ✅ | `SpriteRegistry` — loads every sprite, tracks readiness, fires `onReady` |
| `renderer.ts` | ✅ | `drawScene()` — 3-pass y-sorted render (floor/wall → entities → glow/dust) |
| `input.ts` | ✅ | Held-key tracking via a `Set` |
| `camera.ts` | ✅ | `snapTo()` on load + smooth `follow()` each frame |
| `tilemap.ts` | ✅ | Map builder, object/solid constants, 3 exported maps, `branchLabels` |
| `tile-ids.ts` | ✅ | `TILES` constant object — all tile ID definitions |
| `interactables.ts` | ✅ | Auto-scans `museumMap` for interactable tiles, links to exhibits |

### `/src/data/`

| File | Status | Purpose |
|------|--------|---------|
| `projects.ts` | ✅ Wired, placeholder content | All exhibit content + `roomRegistry`. **Edit this file for content changes.** |

### `/src/components/`

| File | Status | Purpose |
|------|--------|---------|
| `GameCanvas.tsx` | ✅ | Mounts canvas, creates engine, wires events, manages popup state + audio/mute toggles |
| `app/map-snapshot/page.tsx` | ✅ | Developer tool — full-map render viewer with zoom/pan and PNG download |
| `overlays/ExhibitOverlay.tsx` | ✅ | Exhibit popup — text, tags, links, iframe; backdrop blur. Routes `type: "resume"` → ResumePopup and transcript exhibits → TranscriptPopup |
| `overlays/ResumePopup.tsx` | ✅ | Resume popup — tabbed sections, PDF download, themed scrollbar; consumes `/api/resume` |
| `overlays/TranscriptPopup.tsx` | ✅ | Transcript popup — subject-grouped courses; consumes `/api/transcript` |
| `Minimap.tsx` | ✅ | Player-centered minimap — pre-rendered static map, player dot, branch labels, big-map (M) |
| `DialogBox.tsx` | ✅ | "Press E to inspect" bottom prompt |
| `ControlsHint.tsx` | ✅ | "WASD to move · Shift to sprint" overlay — fades out after first move |
| `LoadingScreen.tsx` | ✅ | Splash screen with animated dots, fades out when assets are loaded |
| `HUD.tsx` | 🔲 Stub | Planned room-name title on room entry |

> The original inline-style `ExhibitOverlay.tsx` / `ResumePopup.tsx` reference dups were
> removed in the restructure; the (formerly `.tailwind`) active versions now live under
> `overlays/` with plain names.

### `/src/types/`

Shared response types — imported by **both** the API route and its client component, so
client code never imports from a server `route.ts`.

| File | Purpose |
|------|---------|
| `resume.ts` | `ResumeData`, `ResumeSection`, `ResumeEntry`, `ContactInfo` |
| `transcript.ts` | `TranscriptData`, `SubjectGroup`, `CourseEntry` |

### `/public/assets/`

```
public/assets/
├── sprites/
│   ├── character/   ← idle + walk cycle, 8 directions (states/animations/{idle,walk}/<dir>/)
│   ├── wall-side/   ← horizontal wall variants (tile00–tile04) + wall-side-left/right
│   ├── wall-top/    ← wall-top variants (tile00–tile06) + corner/cross/intersect/knub
│   ├── floor2.png, floor3.png                     ← floor tiles in use
│   ├── pedestal-book.png                          ← pedestal sprite in use
│   └── me-2.png, me-blink.png, me-light-off.png   ← "me at desk" + blink/flicker frames
├── resume/      ← resume PDF (served via /api/resume)
├── transcript/  ← transcript PDF (served via /api/transcript)
└── audio/       ← ambient music (.m4a/.ogg) · footstep.wav · interact.wav
                   (quack.mp3, referenced by the easter egg, is still MISSING — add it)
```

Unused art — AI-generated experiments, the Cute RPG tileset, and the empty `maps/` dir —
was moved out of the build into top-level **`attic/assets/`** (see `attic/README.md`).
A few unreferenced single sprites (`floor.png`, `pedestal{,-2,-3}.png`, `me.png`) remain
under `sprites/` as possible alternates.

---

## Museum Layout

```
North (top)
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │ Experience│    │ Projects  │    │  Archive  │
    │  (11 ex)  │    │  (5 ex)   │    │  (6 ex)   │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
══════════╪════════════════╪════════════════╪═════════════════╗
 ★  [R]   │                │                │            desk ║  hallway
══════════╪══════════╪═════╪══════════╪═════╪═════════════════╝
                     │                │
               ┌─────┴─────┐    ┌─────┴─────┐
               │  About Me │    │   Links   │
               │  (3 ex)   │    │  (4 ex)   │
               └───────────┘    └───────────┘
South (bottom)

★  = Easter Egg — hidden far-left of hallway, looks like plain floor
[R] = Resume pedestal — 1 tile north, 2 tiles right of player spawn
desk = right-margin alcove (7 tiles wide) — place desk + character sprite here
```

Tile IDs on the map encode which exhibit array to pull from. The auto-scanner in `interactables.ts` reads them top→bottom, left→right, and assigns the matching exhibit from `roomRegistry`.

---

## Rendering Pipeline (`renderer.ts`)

Three passes per frame:

**Pass 1 — Floor & walls**
Iterates visible tiles. `VOID` tiles are skipped (background shows through). All other tiles draw their `TILE_COLORS` fill + grid stroke.

**Pass 2 — Y-sorted: player + objects**
Iterates sort rows north→south. Each entity draws when its sort key matches the current row:
- **Player** sort key = bottom-edge row of the player rect
- **Object** (pedestal etc.) sort key = `objectRow + 1` (the pedestal's visual front face)

This means: if the player is north of a pedestal, the pedestal renders on top (player appears to walk behind it). If the player is south, the player renders on top.

The glow for nearby interactables is drawn inside this pass, behind the object but above the floor.

**Pass 3 — nothing** (glow is now inside pass 2)

---

## Three Map Arrays (`tilemap.ts`)

All exported from `tilemap.ts`. Do not reconstruct them — read from these.

| Export | Type | Purpose |
|--------|------|---------|
| `museumMap` | `number[][]` | Tile IDs for floor/wall/interactable. Drives interaction system. |
| `objectMap` | `(number\|null)[][]` | Furniture layer. `null` = empty. Drawn above floor, y-sorted vs player. |
| `solidMap` | `boolean[][]` | True = physically impassable. Decoupled from tile type so sprites can extend beyond tile bounds. |

### Tile IDs (`TILES`)

| ID | Constant | Solid? | Notes |
|----|----------|--------|-------|
| 0 | `FLOOR` | No | Plain walkable floor |
| 1 | `WALL` | Yes | |
| 2 | `PAINTING` | — | Defined in `tile-ids.ts`; not currently placed — reserved for future wall art |
| 3 | `DOOR` | — | Defined in `tile-ids.ts`; not currently placed |
| 17 | `VOID` | Yes | Outside museum bounds, not rendered |
| 10 | `LOBBY` | No | Kept for compat; no longer assigned to a branch — do not reuse ID 10 |
| 11 | `MAIN_HALL` | No | Projects branch (north, center) |
| 12 | `SKILLS_WING` | No | Defined in `tile-ids.ts`; not currently assigned to a branch |
| 13 | `ARCHIVE` | No | Archive branch (north, right) |
| 14 | `OFFICE` | No | About Me branch (south, left) |
| 15 | `GIFT_SHOP` | No | Links branch (south, right) |
| 16 | `EASTER_EGG` | No | Hidden in hallway, no pedestal |
| 18 | `EXPERIENCE` | No | Experience branch (north, left) |
| 19 | `RESUME` | No | Standalone hallway pedestal |

Interactable tiles (11–16, 18–19) are walkable — the player stands **behind** them (north). `solidMap` marks the tile one row **south** of each pedestal as solid, creating the 3D depth effect.

### Object IDs (`OBJECTS`)

| ID | Constant | Notes |
|----|----------|-------|
| 1 | `PEDESTAL` | Auto-placed at all interactable tiles except `EASTER_EGG` |
| 2 | `DISPLAY_CASE` | Glass case variant — place manually in `objectMap` |
| 3 | `BENCH` | |
| 4 | `TABLE` | |
| 5 | `PLANTER` | |
| 6 | `DESK` | Place in desk alcove (far-right hallway margin) |

To place furniture manually:
```ts
import { objectMap, OBJECTS } from "@/game/tilemap";
objectMap[row][col] = OBJECTS.DESK;
```

---

## Auto-Generated Map

`buildMap()` in `tilemap.ts` derives all dimensions from the branch definition arrays. **To add a branch pair**, append one entry to both `northBranches` and `southBranches` — map width, hallway fill, doorways, interiors, and exhibit placement all update automatically.

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

**Layout constants** (all in `tilemap.ts`):

| Constant | Current value | Effect |
|----------|---------------|--------|
| `TILE_SIZE` | 64 | px per tile |
| `BRANCH_WIDTH` | 11 | tiles wide per branch (wall + 9 interior + wall) |
| `BRANCH_GAP` | 12 | hallway tiles between adjacent branches |
| `LEFT_MARGIN` | 2 | hallway tiles before first branch |
| `RIGHT_MARGIN` | 7 | hallway tiles after last branch (desk alcove) |
| `ENTRANCE_BUFFER` | 5 | rows between doorway and nearest exhibit |
| `END_BUFFER` | 3 | rows between end wall and farthest exhibit |
| `EXHIBIT_SPACING` | 5 | rows between consecutive exhibits |
| `DOORWAY_HALF` | 2 | half-width of doorway (doorway = 5 tiles wide) |

**Build steps inside `buildMap()`:**
1. Init all cells to `VOID`
2. Carve hallway floor
3. Carve 5-tile doorways
4. For each branch: carve interior floor, stamp exhibit tiles
5. Place resume tile and easter egg
6. **Adjacency pass** (snapshot-based): any VOID tile adjacent to a non-VOID tile (8-directional) becomes WALL — produces exactly one tile of wall around every room; everything else stays VOID

---

## Adding & Editing Exhibits

All content lives in [`src/data/projects.ts`](src/data/projects.ts).

```ts
// Text + links
{
  popup: {
    title: "My Project",
    description: "Built this.",
    tech: ["React", "TypeScript"],
    links: [{ label: "GitHub", url: "https://github.com/you/project" }],
  },
}

// Playable iframe embed
{
  popup: {
    title: "My Game",
    embedUrl: "https://my-game.vercel.app",
    width: "900px",
    height: "650px",
  },
}

// Audio only (easter egg)
{ audio: "/assets/audio/quack.mp3" }
```

### Room exhibit arrays

| Array | Tile | Branch | Slots |
|-------|------|--------|-------|
| `experienceExhibits` | `EXPERIENCE` (18) | North left | 11 |
| `mainHallExhibits` | `MAIN_HALL` (11) | North center | 5 |
| `archiveExhibits` | `ARCHIVE` (13) | North right | 6 |
| `officeExhibits` | `OFFICE` (14) | South left | 3 |
| `giftShopExhibits` | `GIFT_SHOP` (15) | South right | 4 |
| `resumeExhibit` | `RESUME` (19) | Hallway pedestal | 1 |
| `easterEggExhibits` | `EASTER_EGG` (16) | Hidden hallway | 1 |
| `skillsExhibits` | `SKILLS_WING` (12) | — (not wired) | 6 |
| `lobbyExhibits` | `LOBBY` (10) | — (not wired) | — |

Exhibits beyond the slot count are ignored. The slot count equals `count` in the branch definition.

---

## Adding a New Room Type

1. Add a constant to `TILES` in `tilemap.ts` (use the next available ID).
2. Add it to `INTERACTABLE_TILES` (`Set<number>` — keep the explicit type annotation).
3. Add a floor color entry to `TILE_COLORS` (use `"#2a2a4a"` — the object layer provides the visual).
4. Add the branch to `northBranches` or `southBranches` with a `count`.
5. Optionally add an entry to the other side — north and south can have different lengths; the shorter side's branches are centered between adjacent pairs on the longer side.
6. Create an exhibit array and register it in `roomRegistry` in `projects.ts`.

---

## Sprite Roadmap

Sprites are partially implemented. `renderer.ts` uses `drawImage` for floor tiles, wall tiles, and pedestals (loaded by `sprites.ts`). The player character has idle and walk animations in 8 directions. Remaining work is furniture, NPCs, and atmosphere.

### Priority order

**Structural (highest visual impact)**
- Floor tile (tileable) + 1–2 subtle variants
- Wall back face (north-facing, top of wall)
- Wall baseboard — front face (south-facing, the visible 3D face)
- Wall baseboard corner variants (left, right, inner left, inner right)
- Doorway threshold strip

**Exhibits**
- Pedestal base (wood/stone column)
- Display case top (glass box sitting on pedestal)
- Pedestal + display case as stacked 2-tile sprite

**Exhibit items (on pedestals)**
- Document / rolled scroll (experience, resume)
- Open book (projects, archive)
- Laptop / open laptop
- Trophy / award (skills)
- Duck (easter egg — floor level, no pedestal)

**Characters**
- Player — walk cycle: down / up / left / right (2–4 frames each) + idle
- Me at desk — sitting, back-facing, typing (1–2 frames)
- Guide NPC — idle front-facing + talk (2 frames) *(future)*

**General furniture**
- Desk (2×1, workspace)
- Chair (empty, facing desk)
- Bookshelf (tall, back-facing)
- Bench (horizontal, seats 2)
- Table (1×1 or 2×1)
- Planter / potted plant
- Floor lamp
- Rug (2×2 or 3×2)
- Nameplate / exhibit label

**UI**
- Dialog box background (9-slice)
- "E to interact" key badge
- Tech tag chip
- Popup panel background

**Atmosphere (optional)**
- Ceiling light overhead
- Light cone / radial overlay (multiply blend mode)
- Cast shadow tile

### Adding sprites (`sprites.ts`)

Sprite readiness is tracked via a `tracked()` helper inside `SpriteRegistry`'s constructor. It increments the total synchronously at registration time, then calls `markLoaded()` when the image loads. `onReady` fires once loaded ≥ total (the engine forwards this to its own `onReady`).

To add a new tracked sprite, in `SpriteRegistry`:

```ts
this.myNewSprite = tracked(new Image(), () => { this.myNewReady = true; });
this.myNewSprite.src = url("/assets/sprites/my-new-sprite.png");
```

The `url()` helper appends `?v=<cacheBust>` when the registry is constructed with a cache-busting token (used by `/map-snapshot`). No counter update needed — the total adjusts automatically.

### Implementing sprites (`renderer.ts`)

In `drawScene`, draw the registry's sprites instead of `ctx.fillRect`:

```ts
// Floor/wall pass — replace fillRect with:
ctx.drawImage(tileSprites[tile], screenX, screenY, TILE_SIZE, TILE_SIZE);

// Object pass — objects can extend above their tile (north-facing 3D):
// Draw sprite anchored to bottom of tile, extending upward as needed.
// North-to-south draw order naturally handles overdraw.
ctx.drawImage(objectSprites[obj], screenX, screenY - TILE_SIZE, TILE_SIZE, TILE_SIZE * 2);

// Player pass:
ctx.drawImage(playerSheet, srcX, srcY, 16, 16, screenX, screenY, TILE_SIZE, TILE_SIZE);
```

---

## Data Flow

```
1. Player walks near interactable tile
   └→ interactables.ts: getNearbyInteractable() finds match within 2-tile radius

2. Engine emits: { type: "nearby", content: exhibit }
   └→ GameCanvas.tsx: shows DialogBox ("Press E to inspect")

3. Player presses E
   └→ Engine emits: { type: "interact", content: exhibit }
   └→ GameCanvas.tsx:
       ├─ exhibit.audio → new Howl(src).play()
       ├─ exhibit.popup → setActivePopup(popup), engine.setPaused(true)
       └─ audio only → plays, no popup (easter egg)

4. Player presses Esc or clicks backdrop
   └→ setActivePopup(null), engine.setPaused(false)

5. Player walks away
   └→ Engine emits: { type: "leave" }
   └→ GameCanvas.tsx: hides DialogBox
```

---

## API Routes & Embeds

| Route | Purpose |
|-------|---------|
| `GET /api/resume` | Reads the newest PDF in `public/assets/resume/`, parses it with `pdf-parse` into structured `ResumeData` (sections → entries → bullets), returns JSON. `force-dynamic`, so swapping the PDF needs no rebuild. Rendered by `overlays/ResumePopup.tsx`. |
| `GET /api/transcript` | Same pattern for `public/assets/transcript/` — parses courses into subject groups (`TranscriptData`). Rendered by `overlays/TranscriptPopup.tsx`. |
| `GET /api/jar/[...slug]` | Proxy for playable `.jar` demos. `slug[0]` is a **base64url-encoded** URL; only `https://github.com/<owner>/<repo>/releases/download/…` is allowed (otherwise 403). Forwards `Range` headers so the in-browser Java runner (`public/java-runner.html`) can stream the archive. |
| `GET` · `POST /api/ghosts` | Anonymous visitor movement paths for the museum's "ghost" wisps. `POST` validates + per-IP rate-limits a path and stores it; `GET` returns the most-recent 15 (CDN-cached daily). Backed by **Upstash Redis** (REST API); **degrades to procedural wisps** when Upstash isn't configured. |

Response types live in [`src/types/`](src/types/) and are shared by each route and its component. Competitive-programming stats (LeetCode + DMOJ) and GitHub projects are **not** runtime routes — they're synced to static files by the daily GitHub Action (see below).

---

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

Both run from GitHub's IPs rather than the deployment's, sidestepping the Cloudflare bot-blocking LeetCode applies to datacenter IPs. See [`scripts/GITHUB_SYNC.md`](scripts/GITHUB_SYNC.md) for the project-sync knobs.

### CI & dependencies

- `.github/workflows/ci.yml` gates every PR (and pushes to `main`) on **typecheck + lint + tests**.
- `.github/dependabot.yml` opens weekly batched update PRs; enable **Dependabot alerts + security updates** in repo Settings for advisory PRs.

### Deploying to Vercel

Import the repo (root directory = default), add the two `UPSTASH_*` vars for Production (unquoted, no `NEXT_PUBLIC_`), and deploy — the app degrades gracefully without them. Vercel Web Analytics + Speed Insights are wired in `layout.tsx`; enable them in the project dashboard.

---

## Development Phases

### ✅ Phase 0 — Prerequisites
- [x] HTML5 Canvas + requestAnimationFrame loop
- [x] Keyboard input, delta-time movement
- [x] Tile-based collision

### ✅ Phase 1 — Scaffold
- [x] Next.js 16 + TypeScript + Tailwind
- [x] Framer Motion + Howler.js

### ✅ Phase 2 — Game Engine Core
- [x] 60fps game loop with delta time
- [x] Held-key input manager
- [x] Camera: `snapTo` on load + smooth lerp follow
- [x] Tilemap rendering
- [x] AABB collision with wall snapping
- [x] Auto-scanning interactable system
- [x] Engine → React event bridge

### ✅ Phase 3 — Museum Map
- [x] Auto-generated map from branch definitions
- [x] VOID tiles — museum silhouette, not a rectangle
- [x] Snapshot-based wall adjacency pass
- [x] 5 branch rooms + hallway + desk alcove
- [x] Standalone resume pedestal in hallway
- [x] Hidden Easter egg

### ✅ Phase 4 — Layered Rendering & 3D Effect
- [x] Three map arrays: `museumMap`, `objectMap`, `solidMap`
- [x] Object layer (furniture) rendered above floor
- [x] Y-sorted pass: player + objects draw in north→south order
- [x] Pedestal physics: solid one row south, walkable behind (north)
- [x] Soft glow on nearby interactable, y-sorted with object
- [x] Exhibit layout symmetry correction for south branches

### ✅ Phase 5 — React Overlay UI

- [x] `overlays/ExhibitOverlay.tsx` — text, tags, links, iframe; Tailwind CSS with hover/focus states and backdrop blur
- [x] `overlays/ResumePopup.tsx` — tabbed resume viewer, PDF download, `/api/resume` integration; themed scrollbar
- [x] `overlays/TranscriptPopup.tsx` — subject-grouped transcript viewer, `/api/transcript` integration
- [x] `DialogBox.tsx` — "Press E" prompt
- [x] Audio on interact (Howler.js wired — audio files still needed)
- [x] Pause/unpause engine during popup
- [x] `Minimap.tsx` — player-centered minimap with branch labels
- [x] `ControlsHint.tsx` — WASD hint overlay
- [x] `LoadingScreen.tsx` — splash screen with animated dots
- [ ] HUD — room name label

### 🚧 Phase 6 — Sprites & Art (In Progress)
- [x] Replace `fillRect` with `drawImage` in `engine.ts`
- [x] Player idle + walk cycle (8 directions)
- [x] Wall sprites (side + top variants)
- [x] Floor tile variants
- [x] Pedestal sprite
- [ ] "Me at desk" character in the alcove
- [ ] Duck Easter egg sprite
- [ ] Furniture (desk, bookshelf, bench, lamp, planter, rug)

### 🔲 Phase 7 — Content
- [ ] Fill `projects.ts` with real data (URLs, descriptions, experience)
- [x] Add resume PDF to `public/assets/resume/`
- [ ] Add `quack.mp3` to `public/assets/audio/`

### 🔲 Phase 8 — Polish & Deploy
- [ ] Footstep sounds, ambient music
- [ ] Mobile touch controls (virtual D-pad)
- [ ] `<noscript>` fallback
- [ ] Meta tags + Open Graph image
- [ ] Asset preloading before game start
- [ ] Vercel deploy + custom domain

---

## Key Design Decisions

**Canvas over DOM for the game** — DOM manipulation at 60fps creates GC pauses and layout thrashing. Canvas gives a single draw surface with predictable performance.

**Engine decoupled from React** — The loop runs 60×/second. Keeping them separate means the engine stays fast and React stays clean.

**Auto-scan interactables** — Hardcoded positions break every time the map changes. Scanning the grid means you place a tile, add an exhibit, done.

**Auto-generated map** — Branch count drives map width; branch depth drives branch floor carving. Adding a room is one array entry.

**solidMap decoupled from tile type** — Sprites in a top-down 3D style extend above their tile bounds. Collision must not be tied to visual tile identity. `solidMap` is a plain `boolean[][]` that can be shaped independently.

**Y-sort for depth** — Objects with a higher sort row (further south) draw last = appear in front. One row of offset between the interactable tile and its pedestal physics creates the illusion that the player walks behind the exhibit.
