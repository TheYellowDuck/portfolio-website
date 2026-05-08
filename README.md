# Museum Portfolio

A 2D pixel-art museum where visitors control a character walking through themed rooms, interacting with exhibits that showcase projects, skills, and contact info. Built with Next.js, TypeScript, Tailwind CSS, and HTML5 Canvas.

---

## For Claude Code / AI Assistants

If you're picking this up in a future session, read this section first.

### What is actually working right now

- The game engine runs: canvas renders, player moves, camera follows, collision works.
- Player is 40×40 px and spawns at the center of the hallway (tile col 26, row 16).
- Map is 54×34 tiles built by `buildMap()`. `TILE_SIZE=48` — the hallway is 10 tiles tall (480px), approximately half a ~960px screen. Corridors are 4 tiles wide (192px).
- Interactable tiles (10–16) glow red when the player walks near them. Pressing **E** opens a popup.
- All 7 room exhibit arrays in `projects.ts` are wired to their tile IDs and display correctly.
- The `ExhibitOverlay` popup handles text, tech tags, links, and iframe embeds.
- `DialogBox` shows the "Press E to inspect" prompt when near an exhibit.
- Audio plays via Howler.js on interact when `exhibit.audio` is set.

### What is stubbed / empty and needs implementation

| File | Status | What it needs |
|------|--------|---------------|
| `src/components/HUD.tsx` | Empty stub | Minimap, current room name, controls hint overlay |
| `src/components/LoadingScreen.tsx` | Empty stub | Splash screen shown while assets preload |
| `src/game/player.ts` | Empty stub | Sprite animation, facing direction tracking (engine.ts handles movement inline for now) |
| `src/game/collision.ts` | Empty stub | Extracted collision logic (engine.ts has it inline in `resolveCollisionX/Y`) |

### Known constraints

- **Do not run `npm audit fix --force`** — it downgrades `next` to 9.x (a known npm bug with a PostCSS advisory). The 2 moderate vulnerabilities flagged by audit exist inside Next.js itself with no released fix yet; they are safe to ignore for a personal portfolio.
- `INTERACTABLE_TILES` must be typed `Set<number>` explicitly (not inferred) — TypeScript's narrowing makes `.has(number)` fail if the type is inferred as the literal union.
- The map in `tilemap.ts` is a hardcoded 40×30 grid. The current exhibits assigned to painting tiles are **placeholder content** — the real project URLs, descriptions, and contact links still need to be filled in inside `projects.ts`.
- `player.ts` and `collision.ts` are empty but imported nowhere — they are placeholders for when the engine is refactored. Do not try to import them.

### What to work on next (Phase 5 — Sprites)

The biggest visual gap: everything renders as colored rectangles. The next major milestone is replacing them with pixel-art sprites:

1. Add a character sprite sheet (4 directions × 4 walk frames) to `public/assets/sprites/`.
2. Implement walk animation in `engine.ts` or extract to `player.ts` — track `facing` direction and cycle frame index using accumulated delta time.
3. Add a museum tileset (walls, floors, paintings) to `public/assets/tilesets/`.
4. Update `engine.ts render()` to draw `drawImage` calls instead of `fillRect` for each tile type.

---

## Why This Approach

A polished 2D pixel-art museum is more charming, more distinctive, and more achievable than a 3D gallery. It runs on everything, lets you focus on interaction design and content, and the technical complexity (you're building a mini game engine) is portfolio-worthy on its own. Think Undertale / Stardew Valley / Pokémon — not a tech demo, but an experience people want to explore.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **WASD** or **Arrow Keys** to move. Press **E** (or **Enter**) near a glowing painting to open it. Press **Esc** to close.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| **Next.js 16** | Framework, routing, SSR, deployment |
| **TypeScript** | Type safety across game engine + React |
| **Tailwind CSS** | Styling for overlay UI |
| **HTML5 Canvas** | Game rendering (tilemap, sprites, particles) |
| **Framer Motion** | Popup animations (enter/exit transitions) |
| **Howler.js** | Audio playback (footsteps, ambient, SFX) |
| **Tiled** *(future)* | Visual map design → JSON export |
| **Aseprite / LibreSprite** *(future)* | Pixel art sprites and tileset customization |

---

## Architecture Overview

Two completely separate layers that communicate through events:

```
┌─────────────────────────────────────────────────┐
│                  REACT LAYER                     │
│  (Popups, HUD, Dialog, Loading Screen)           │
│                                                  │
│  GameCanvas.tsx ← listens for engine events      │
│       ↕ renders                                  │
│  ExhibitOverlay.tsx   DialogBox.tsx   HUD.tsx     │
└──────────────────────┬──────────────────────────┘
                       │ events: nearby / interact / leave
┌──────────────────────┴──────────────────────────┐
│                GAME ENGINE LAYER                 │
│  (Pure TypeScript, no React dependency)          │
│                                                  │
│  engine.ts → runs update/render loop at 60fps    │
│  input.ts → tracks held keys                     │
│  camera.ts → viewport follows player             │
│  tilemap.ts → map data + tile rendering          │
│  player.ts → (stub) sprite animation             │
│  interactables.ts → auto-scans map for exhibits  │
└─────────────────────────────────────────────────┘
```

**Key principle:** The game engine never imports React. React never draws to the canvas. They communicate only through an `onEvent` callback on the `GameEngine` class.

---

## File Map

### `/src/game/` — Pure TypeScript Game Engine

| File | Status | Purpose |
|------|--------|---------|
| `engine.ts` | ✅ Complete | Main loop: update → render at 60fps. Player movement, collision, interaction detection. Emits events to React. |
| `input.ts` | ✅ Complete | Tracks held keys via a `Set`. Game loop polls `isDown("ArrowUp")` each frame. |
| `camera.ts` | ✅ Complete | Viewport offset that smooth-lerps to follow the player. |
| `tilemap.ts` | ✅ Complete | Map grid, tile constants (0–16), colors, `getTileAt`, `setTileAt`. Exports `TILES`, `INTERACTABLE_TILES`, `TILE_COLORS`. |
| `interactables.ts` | ✅ Complete | Auto-scans map for interactable tile types, links them to exhibits from `roomRegistry` in reading order (left→right, top→bottom). |
| `player.ts` | 🔲 Stub | Future home for character sprite animation and facing direction. Movement is currently inline in `engine.ts`. |
| `collision.ts` | 🔲 Stub | Future home for extracted collision logic. Currently inline in `engine.ts` as `resolveCollisionX/Y`. |

### `/src/data/` — Content Layer

| File | Status | Purpose |
|------|--------|---------|
| `projects.ts` | ✅ Wired, placeholder content | Defines `Exhibit` type and all room exhibit arrays. Exports `roomRegistry` mapping tile IDs → exhibit lists. **Fill this in with your real projects.** |

### `/src/components/` — React UI Layer

| File | Status | Purpose |
|------|--------|---------|
| `GameCanvas.tsx` | ✅ Complete | Mounts `<canvas>`, creates engine, wires all events. Plays audio, manages popup state. |
| `ExhibitOverlay.tsx` | ✅ Complete | Centered popup — handles title, description, tech tags, links, and iframe embeds. |
| `DialogBox.tsx` | ✅ Complete | "Press E to inspect" prompt at the bottom of the screen. |
| `HUD.tsx` | 🔲 Stub | Future minimap, room name label, controls hint. |
| `LoadingScreen.tsx` | 🔲 Stub | Future splash screen while assets preload. |

### `/public/assets/` — Static Assets

```
public/assets/
├── sprites/     ← Character + NPC sprite sheets (.png) — not yet created
├── tilesets/    ← Museum wall/floor/decoration tiles (.png) — not yet created
├── maps/        ← Tiled JSON exports — not yet used
└── audio/       ← Footsteps, ambient music, SFX (.mp3/.ogg)
                   (quack.mp3 referenced in easter egg — add this file)
```

---

## Museum Layout

The map is 54 × 34 tiles at `TILE_SIZE=64`. Branch rooms are perpendicular hallways — each is 5 tiles wide (wall + 3 floor + wall) and as deep as its exhibit count. Exhibits sit in the center column, one per row.

```
cols:    5-9        24-28       43-47
         |           |            |
row  5  [■]  Skills [■]  Office  [■] Gift Shop
row  6  [E]  (6 ex) [E]  (3 ex) [E] (4 ex)
...      |           |            |
row 11   |           |            |       <- hallway north wall (opens here)
     ════════════════★════════════════    row 12-21
row 22   |           |            |       <- hallway south wall (opens here)
row 23  [E]  Lobby  [E] MainHall [E] Archive
...     [E]  (3 ex) [E]  (5 ex) [E] (6 ex)
row 28   |           |            |
         [■]         [■]          [■]     <- end walls

★ = Easter Egg hidden at (row 16, col 2) far left of hallway
[E] = exhibit tile (center of branch corridor, triggers on E press)
[■] = wall
```

Each branch tile number (10–16) auto-links to the next exhibit in that room's array (scanned top→bottom). To add a room or change depths, edit `buildMap()` in [tilemap.ts](src/game/tilemap.ts).

### Map generator

`buildMap()` in [tilemap.ts](src/game/tilemap.ts):
1. Fills everything with `WALL`
2. Carves the main hallway with `fill()`
3. Carves each branch corridor with `fill()`, connecting it to the hallway
4. Places exhibit tiles in the center column of each branch with a `for` loop

To change a branch's depth, adjust the row range in both the `fill()` call and the exhibit `for` loop. The two must always match.

---

## Adding & Editing Exhibits

**All content is in [`src/data/projects.ts`](src/data/projects.ts).** You never need to touch the game engine to change what pops up.

```ts
// Text + links
{
  popup: {
    title: "My Project",
    description: "Built this cool thing.",
    tech: ["React", "TypeScript"],
    links: [{ label: "GitHub", url: "https://github.com/you/project" }],
  },
}

// Playable iframe demo
{
  popup: {
    title: "My Game",
    embedUrl: "https://my-game.vercel.app",
    width: "900px",    // optional, default 500px
    height: "650px",   // optional, default 650px
  },
}

// Audio only — no popup (easter egg)
{ audio: "/assets/audio/quack.mp3" }

// Audio + popup together
{
  audio: "/assets/audio/secret.mp3",
  popup: { title: "Secret Found!", description: "Nice work." },
}
```

### Room exhibit arrays

| Array | Tile ID | Slots on map |
|-------|---------|-------------|
| `lobbyExhibits` | `TILES.LOBBY` (10) | 3 |
| `mainHallExhibits` | `TILES.MAIN_HALL` (11) | 5 |
| `skillsExhibits` | `TILES.SKILLS_WING` (12) | 6 |
| `archiveExhibits` | `TILES.ARCHIVE` (13) | 6 |
| `officeExhibits` | `TILES.OFFICE` (14) | 3 |
| `giftShopExhibits` | `TILES.GIFT_SHOP` (15) | 4 |
| `easterEggExhibits` | `TILES.EASTER_EGG` (16) | 1 |

Extras beyond the slot count are silently ignored. Fewer than the slot count leaves the remaining tiles inert.

---

## Modifying the Map

The map is the 40×30 `museumMap` grid in [`src/game/tilemap.ts`](src/game/tilemap.ts).

| ID | Constant | Behavior |
|----|----------|----------|
| `0` | `TILES.FLOOR` | Walkable, dark blue |
| `1` | `TILES.WALL` | Solid — blocks movement |
| `2` | `TILES.PAINTING` | Walkable, red (decorative only) |
| `3` | `TILES.DOOR` | Walkable, dark blue |
| `10–16` | `TILES.LOBBY` … `TILES.EASTER_EGG` | Walkable, red, glows when player is within 2 tiles, triggers exhibit on E |

### Add a new interactable painting

1. Place a tile ID (10–16) at the desired position in `museumMap`.
2. Append a new `Exhibit` to the matching array in `projects.ts`. Order in the array = reading order on the map.

### Add a new room type

1. Add a constant to `TILES` in `tilemap.ts` (e.g., `LIBRARY: 17`).
2. Add a color to `TILE_COLORS`.
3. Add it to `INTERACTABLE_TILES` (the set must stay typed as `Set<number>`).
4. Add an exhibit array and register it in `roomRegistry` in `projects.ts`.
5. Place the tile on the map.

---

## Changing Appearance

- **Tile colors** → `TILE_COLORS` in `tilemap.ts`
- **Player color** → `ctx.fillStyle = "#e94560"` in `engine.ts` `render()` (replace with `drawImage` when sprites exist)
- **Popup style** → inline styles in `ExhibitOverlay.tsx`
- **Dialog prompt** → `DialogBox.tsx`
- **Canvas background** → `ctx.fillStyle = "#0a0a0a"` in `engine.ts` `render()`
- **Page background** → `globals.css`

---

## Audio

Place files in `public/assets/audio/` and reference with a leading slash:

```ts
{ audio: "/assets/audio/my-sound.mp3" }
```

Played via [Howler.js](https://howlerjs.com/). Fires once on interact.

---

## Data Flow

```
1. Player walks near tile 10–16
   └→ interactables.ts: getNearbyInteractable() finds closest match

2. Engine emits: { type: "nearby", content: exhibit }
   └→ GameCanvas.tsx: shows DialogBox ("Press E to inspect")

3. Player presses E
   └→ Engine emits: { type: "interact", content: exhibit }
   └→ GameCanvas.tsx:
       ├─ exhibit.audio → new Howl(src).play()
       ├─ exhibit.popup → setActivePopup(popup), engine.setPaused(true)
       └─ neither → silent (audio-only easter egg still plays)

4. Player presses Esc or clicks backdrop
   └→ setActivePopup(null), engine.setPaused(false)

5. Player walks away
   └→ Engine emits: { type: "leave" }
   └→ GameCanvas.tsx: hides DialogBox
```

---

## Development Phases

### ✅ Phase 0 — Prerequisites
- [x] HTML5 Canvas + requestAnimationFrame game loop
- [x] Keyboard input handling
- [ ] Sprite sheet animation
- [ ] Tiled map editor
- [ ] Pixel art (Aseprite / LibreSprite)

### ✅ Phase 1 — Scaffold
- [x] Next.js + TypeScript + Tailwind
- [x] Framer Motion + Howler.js installed
- [x] Folder structure created

### ✅ Phase 2 — Game Engine Core
- [x] Game loop with delta time (`engine.ts`)
- [x] Keyboard input manager (`input.ts`)
- [x] Camera with smooth lerp (`camera.ts`)
- [x] Tilemap rendering (`tilemap.ts`)
- [x] Collision detection with wall snapping
- [x] Auto-scanning interactable system (`interactables.ts`)
- [x] Event system connecting engine → React

### ✅ Phase 3 — Museum Map
- [x] 40×30 map with open layout
- [x] Room-specific tile types (10–16) wired to exhibit arrays
- [x] Doorways (tile 3 present on map)
- [ ] Replace hardcoded grid with Tiled JSON export
- [ ] Auto-generate map from project data (stretch goal)

### ✅ Phase 4 — React Overlay UI
- [x] Unified popup (`ExhibitOverlay.tsx`) — text, tags, links, iframe embed
- [x] "Press E" dialog prompt (`DialogBox.tsx`)
- [x] Audio on interact (Howler.js)
- [x] Pause/unpause engine during popup
- [x] ESC to close
- [ ] HUD — minimap, room name, controls hint (`HUD.tsx` is a stub)
- [ ] Loading/splash screen (`LoadingScreen.tsx` is a stub)

### 🔲 Phase 5 — Sprites & Art (NEXT)
- [ ] Character sprite sheet (4 directions × 4 walk frames)
- [ ] Walk animation system — facing direction + frame cycling in `engine.ts` or `player.ts`
- [ ] Museum tileset (walls, floors, paintings, decorations)
- [ ] Replace `fillRect` calls in `engine.ts render()` with `drawImage`
- [ ] Room-specific decorative props

### 🔲 Phase 6 — Polish & Juice
- [ ] Footstep sounds while walking
- [ ] Ambient background music
- [ ] Particle effects (dust motes, spotlight glow)
- [ ] NPC museum guide (optional)
- [ ] Mobile touch controls (virtual D-pad)
- [ ] Easter egg hidden room

### 🔲 Phase 7 — Content & Deploy
- [ ] Fill `projects.ts` with real project data (URLs, descriptions, links)
- [ ] Add real resume PDF to `public/`
- [ ] `<noscript>` fallback with plain HTML content
- [ ] Meta tags + Open Graph image
- [ ] Asset preloading before game start
- [ ] Performance profiling (< 16ms per frame target)
- [ ] Deploy to Vercel + custom domain
- [ ] Analytics (Vercel Analytics or Plausible)

---

## Key Design Decisions

**Canvas over DOM/CSS for the game** — DOM manipulation at 60fps creates GC pauses and layout thrashing. Canvas gives a single draw surface with predictable performance. React handles only the overlay UI, which updates infrequently.

**Engine decoupled from React** — The game loop runs 60×/second. Keeping them separate means the engine stays fast and React stays clean. They communicate only through the `onEvent` callback.

**Auto-scan interactables** — Hardcoded positions break every time you edit the map. Scanning the grid means you just place a tile and add an exhibit to the list — the system handles the mapping.

**One unified Exhibit type** — Multiple types (project, demo, redirect, easter-egg) created unnecessary complexity. One type with optional fields covers every use case.

---

## Future Ideas

- Auto-generated maps: feed project data into a generator that creates rooms sized to fit content
- NPC guided tour: a character that walks visitors through exhibits in sequence
- Guestbook: Supabase or a simple form for visitor messages
- Multiplayer ghost cursors: show other visitors as sprite overlays (WebSocket)
- Seasonal themes: swap tilesets/music for holidays
- Achievement system: track which exhibits a visitor has seen
