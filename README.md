# Museum Portfolio

A 2D pixel-art museum where visitors control a character walking through themed rooms, interacting with exhibits that showcase projects, skills, experience, and contact info. Built with Next.js 16, TypeScript, Tailwind CSS, and HTML5 Canvas.

---

## Vision & Aesthetic

The portfolio should feel like wandering into a well-loved private library at golden hour — cozy, serene, and personal. Think warm wood paneling, bookshelves, soft lamplight, worn rugs. A lo-fi playlist playing in another room. The kind of space that feels lived-in and reflects the owner's personality, not a cold public institution.

**Mood:** cozy · serene · lo-fi · home library / mansion · personal  
**Not:** dark · edgy · cold · corporate · cyberpunk

### Color palette

All colors are centralized in [`src/styles/theme.ts`](src/styles/theme.ts). Never hardcode hex values elsewhere.

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
- Map is **auto-generated** — width and height are computed from branch definitions. Currently ~72 cols × 83 rows at `TILE_SIZE = 64`. Do not hardcode dimensions anywhere.
- Three rendering layers: **floor/wall** (pass 1) → **player + objects y-sorted** (pass 2) → **glow** (on top).
- Objects (`objectMap`) are rendered above the floor and y-sorted against the player for a 3D depth effect.
- Collision is driven by `solidMap` (a `boolean[][]`), which is independent of tile type — allows sprites to extend beyond their tile bounds.
- VOID tiles surround the museum; the map silhouette is the museum shape, not a rectangle.
- Interactable tiles glow and show a dialog prompt. Pressing **E** opens a popup.
- A standalone **Resume pedestal** sits in the main hallway, one tile north and two tiles right of player spawn.
- The far-right margin of the hallway is a **desk alcove** (7 tiles wide) — floor space reserved for a desk sprite and "me at my desk" character.
- Camera snaps to player on load (no pan from top-left).

### What is stubbed / needs implementation

| File | Status | What it needs |
|------|--------|---------------|
| `src/components/HUD.tsx` | Empty stub | Minimap, room name label, controls hint overlay |
| `src/components/LoadingScreen.tsx` | Empty stub | Splash screen while assets preload |
| `src/game/player.ts` | Empty stub | Sprite animation, facing direction (movement is inline in `engine.ts`) |
| `src/game/collision.ts` | Empty stub | Extracted collision logic (inline in `engine.ts` as `resolveCollisionX/Y`) |
| `projects.ts` | Wired, placeholder content | Real project URLs, descriptions, experience entries, contact links |
| `public/assets/audio/quack.mp3` | Missing file | Easter egg audio — add this file |

### Known constraints

- **Never run `npm audit fix --force`** — it downgrades `next` to 9.x. The 2 moderate PostCSS advisories have no released fix; ignore them.
- `INTERACTABLE_TILES` must be typed `Set<number>` explicitly — TypeScript narrows the inferred type to a literal union, breaking `.has(number)`.
- `player.ts` and `collision.ts` are empty placeholders imported nowhere. Don't try to use them.
- Map dimensions are auto-computed from `northBranches` / `southBranches` arrays in `tilemap.ts`. Never hardcode `ROWS` or `COLS` elsewhere.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **WASD** or **Arrow Keys** to move. Press **E** or **Enter** near a glowing pedestal to open it. Press **Esc** to close.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| **Next.js 16** | Framework, routing, SSR, deployment |
| **TypeScript** | Type safety across game engine + React |
| **Tailwind CSS** | Styling for overlay UI |
| **HTML5 Canvas** | Game rendering (tilemap, objects, sprites) |
| **Framer Motion** | Popup enter/exit animations |
| **Howler.js** | Audio playback (SFX, ambient) |
| **Aseprite / LibreSprite** *(planned)* | Pixel art sprites and tilesets |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  REACT LAYER                     │
│  GameCanvas.tsx ← listens for engine events      │
│  ExhibitOverlay.tsx   DialogBox.tsx   HUD.tsx     │
└──────────────────────┬──────────────────────────┘
                       │ events: nearby / interact / leave
┌──────────────────────┴──────────────────────────┐
│                GAME ENGINE LAYER                 │
│  engine.ts   → 60fps update + render loop        │
│  input.ts    → held-key tracking                 │
│  camera.ts   → snapTo on load, smooth follow     │
│  tilemap.ts  → map data, 3 exported arrays       │
│  interactables.ts → auto-scans map for exhibits  │
└─────────────────────────────────────────────────┘
```

**Key principle:** the game engine never imports React. They communicate only through the `onEvent` callback on `GameEngine`.

---

## File Map

### `/src/game/`

| File | Status | Purpose |
|------|--------|---------|
| `engine.ts` | ✅ | Main loop, movement, collision, interaction, 3-pass render, y-sort |
| `input.ts` | ✅ | Held-key tracking via a `Set` |
| `camera.ts` | ✅ | `snapTo()` on load + smooth `follow()` each frame |
| `tilemap.ts` | ✅ | Map builder, tile/object/solid constants, 3 exported maps |
| `interactables.ts` | ✅ | Auto-scans `museumMap` for interactable tiles, links to exhibits |
| `player.ts` | 🔲 Stub | Future sprite animation + facing direction |
| `collision.ts` | 🔲 Stub | Future extracted collision logic |

### `/src/data/`

| File | Status | Purpose |
|------|--------|---------|
| `projects.ts` | ✅ Wired, placeholder content | All exhibit content + `roomRegistry`. **Edit this file for content changes.** |

### `/src/components/`

| File | Status | Purpose |
|------|--------|---------|
| `GameCanvas.tsx` | ✅ | Mounts canvas, creates engine, wires events, manages popup state |
| `ExhibitOverlay.tsx` | ✅ | Popup — title, description, tech tags, links, iframe embeds |
| `DialogBox.tsx` | ✅ | "Press E to inspect" bottom prompt |
| `HUD.tsx` | 🔲 Stub | Minimap, room name, controls hint |
| `LoadingScreen.tsx` | 🔲 Stub | Splash screen |

### `/public/assets/`

```
public/assets/
├── sprites/     ← character + NPC sheets (.png) — not yet created
├── tilesets/    ← museum walls/floors/objects (.png) — not yet created
├── maps/        ← Tiled JSON exports — not yet used
└── audio/       ← SFX, ambient (.mp3/.ogg)
                   quack.mp3 is referenced by easter egg — add this file
```

---

## Museum Layout

```
North (top)
                 col 8         col 31        col 54
                   │             │              │
              ┌─────────┐  ┌─────────┐  ┌─────────┐
              │Experience│  │Projects │  │  Skills  │
              │ (4 ex)  │  │ (5 ex)  │  │ (6 ex)  │
              └────┬────┘  └────┬────┘  └────┬────┘
═══════════════════╪════════════╪═════════════╪══════════════════╗
 ★  [R]            │            │             │              desk ║  hallway
═══════════════════╪════════════╪═════════════╪══════════════════╝
              ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
              │ Archive │  │ About Me│  │  Links  │
              │ (6 ex)  │  │ (3 ex)  │  │ (4 ex)  │
              └─────────┘  └─────────┘  └─────────┘
South (bottom)

★  = Easter Egg — hidden far-left of hallway, looks like plain floor
[R] = Resume pedestal — 1 tile north, 2 tiles right of player spawn
desk = right-margin alcove (7 tiles wide) — place desk + character sprite here
```

Tile IDs on the map encode which exhibit array to pull from. The auto-scanner in `interactables.ts` reads them top→bottom, left→right, and assigns the matching exhibit from `roomRegistry`.

---

## Rendering Pipeline (`engine.ts`)

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
| 17 | `VOID` | Yes | Outside museum bounds, not rendered |
| 10 | `LOBBY` | No | Kept for compat, not currently on map |
| 11 | `MAIN_HALL` | No | Projects branch (north, center) |
| 12 | `SKILLS_WING` | No | Skills branch (north, right) |
| 13 | `ARCHIVE` | No | Archive branch (south, left) |
| 14 | `OFFICE` | No | About Me branch (south, center) |
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
  { tile: TILES.EXPERIENCE,  count: 4 },
  { tile: TILES.MAIN_HALL,   count: 5 },
  { tile: TILES.SKILLS_WING, count: 6 },
];

const southBranches: BranchDef[] = [
  { tile: TILES.ARCHIVE,   count: 6 },
  { tile: TILES.OFFICE,    count: 3 },
  { tile: TILES.GIFT_SHOP, count: 4 },
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
| `experienceExhibits` | `EXPERIENCE` (18) | North left | 4 |
| `mainHallExhibits` | `MAIN_HALL` (11) | North center | 5 |
| `skillsExhibits` | `SKILLS_WING` (12) | North right | 6 |
| `archiveExhibits` | `ARCHIVE` (13) | South left | 6 |
| `officeExhibits` | `OFFICE` (14) | South center | 3 |
| `giftShopExhibits` | `GIFT_SHOP` (15) | South right | 4 |
| `resumeExhibit` | `RESUME` (19) | Hallway pedestal | 1 |
| `easterEggExhibits` | `EASTER_EGG` (16) | Hidden hallway | 1 |

Exhibits beyond the slot count are ignored. The slot count equals `count` in the branch definition.

---

## Adding a New Room Type

1. Add a constant to `TILES` in `tilemap.ts` (use the next available ID).
2. Add it to `INTERACTABLE_TILES` (`Set<number>` — keep the explicit type annotation).
3. Add a floor color entry to `TILE_COLORS` (use `"#2a2a4a"` — the object layer provides the visual).
4. Add the branch to `northBranches` or `southBranches` with a `count`.
5. Add a matching entry to the other array (they must stay the same length).
6. Create an exhibit array and register it in `roomRegistry` in `projects.ts`.

---

## Sprite Roadmap

Everything currently renders as colored rectangles. The next major milestone is replacing them. Sprites should be designed at **16×16 px native** (rendered 4× at 64px tile size).

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

### Implementing sprites in `engine.ts`

When sprites are ready, replace `ctx.fillRect` calls in the two render passes:

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
- [x] 6 branch rooms + hallway + desk alcove
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
- [x] `ExhibitOverlay.tsx` — text, tags, links, iframe
- [x] `DialogBox.tsx` — "Press E" prompt
- [x] Audio on interact (Howler.js)
- [x] Pause/unpause engine during popup
- [ ] HUD — minimap, room name, controls hint
- [ ] Loading / splash screen

### 🔲 Phase 6 — Sprites & Art (NEXT)
- [ ] Design sprites at 16×16 px (see sprite roadmap above)
- [ ] Replace `fillRect` with `drawImage` in `engine.ts`
- [ ] Player walk cycle (4 directions × 2–4 frames)
- [ ] Wall back face + baseboard front face
- [ ] Pedestal + display case sprite
- [ ] "Me at desk" character in the alcove
- [ ] Duck Easter egg sprite

### 🔲 Phase 7 — Content
- [ ] Fill `projects.ts` with real data (URLs, descriptions, experience)
- [ ] Add resume PDF to `public/`
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
