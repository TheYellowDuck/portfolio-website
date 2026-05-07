# Museum Portfolio

A pixel-art museum you walk through in the browser. Each "painting" on the wall is an interactable exhibit that pops up project info, links, embedded demos, or plays audio. Built with Next.js, TypeScript, and a canvas-based game engine.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **WASD** or **Arrow Keys** to move. Press **E** (or **Enter**) near a glowing painting to open it. Press **Esc** to close.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (fonts, global CSS)
│   ├── page.tsx            # Entry point — just renders <GameCanvas>
│   └── globals.css         # Global styles
├── components/
│   ├── GameCanvas.tsx      # React shell: mounts the engine, manages popup state
│   ├── DialogBox.tsx       # "Press E to inspect" prompt
│   ├── ExhibitOverlay.tsx  # The popup modal shown on interact
│   ├── HUD.tsx             # (reserved for future HUD elements)
│   └── LoadingScreen.tsx   # (reserved for a loading screen)
├── data/
│   └── projects.ts         # ← All your content lives here
└── game/
    ├── engine.ts           # Game loop, movement, collision, rendering
    ├── tilemap.ts          # Tile IDs, colors, and the museum map grid
    ├── interactables.ts    # Scans the map and pairs tiles with exhibit data
    ├── camera.ts           # Smooth-follow camera
    └── input.ts            # Keyboard input manager
```

---

## Adding & Editing Exhibits

**All content is in [`src/data/projects.ts`](src/data/projects.ts).** You never need to touch the game engine to change what pops up.

Each room has its own array of `Exhibit` objects. The exhibits are assigned to map tiles in the order they appear in the array — first exhibit → first painting tile of that room (scanning left→right, top→bottom).

### Exhibit shapes

```ts
// Text + links only
{
  popup: {
    title: "My Project",
    description: "A short description shown in the popup.",
    tech: ["React", "TypeScript"],           // optional tag pills
    links: [
      { label: "GitHub", url: "https://github.com/you/project" },
      { label: "Live Demo", url: "https://project.vercel.app" },
    ],
  },
}

// Embedded iframe (playable game, CodeSandbox, etc.)
{
  popup: {
    title: "My Game",
    embedUrl: "https://my-game.vercel.app",
    width: "900px",    // optional, defaults to 500px
    height: "650px",   // optional, defaults to 650px
    links: [{ label: "Source", url: "https://github.com/you/game" }],
  },
}

// Audio only — no popup (good for easter eggs)
{
  audio: "/assets/audio/quack.mp3",   // path relative to /public
}

// Audio + popup together
{
  audio: "/assets/audio/discovery.mp3",
  popup: { title: "Secret Found!", description: "Nice work." },
}
```

### Room arrays

| Array | Room | Painting tiles on map |
|---|---|---|
| `lobbyExhibits` | Lobby / Entrance | 3 |
| `mainHallExhibits` | Main Hall / Featured Projects | 5 |
| `skillsExhibits` | Skills & Tech Wing | 6 |
| `archiveExhibits` | Archive / Other Projects | 6 |
| `officeExhibits` | Office / About Me | 3 |
| `giftShopExhibits` | Gift Shop / Contact | 4 |
| `easterEggExhibits` | Easter Eggs | 1 |

If you add more items to an array than there are painting tiles for that room, the extras are silently ignored. If you add fewer, the remaining tiles are inert (no glow, no interaction).

---

## Modifying the Map

The map is a 2D number grid in [`src/game/tilemap.ts`](src/game/tilemap.ts). Each number is a tile ID:

| ID | Constant | Visual |
|---|---|---|
| `0` | `TILES.FLOOR` | Dark blue floor |
| `1` | `TILES.WALL` | Grey/purple wall |
| `2` | `TILES.PAINTING` | Red tile (decorative, non-interactive) |
| `3` | `TILES.DOOR` | Dark blue door |
| `10` | `TILES.LOBBY` | Red (interactable — lobby exhibits) |
| `11` | `TILES.MAIN_HALL` | Red (interactable — main hall exhibits) |
| `12` | `TILES.SKILLS_WING` | Red (interactable — skills exhibits) |
| `13` | `TILES.ARCHIVE` | Red (interactable — archive exhibits) |
| `14` | `TILES.OFFICE` | Red (interactable — office exhibits) |
| `15` | `TILES.GIFT_SHOP` | Red (interactable — gift shop exhibits) |
| `16` | `TILES.EASTER_EGG` | Red (interactable — easter egg exhibits) |

**Rules:**
- `1` (WALL) blocks movement. Everything else is walkable.
- Interactable tiles (10–16) glow red when the player is within 2 tiles. They behave like floor tiles visually but trigger the exhibit on that room's list.
- The map is 40 columns × 30 rows. Expanding it is as simple as adding rows/columns to the array (keep the outer wall of `1`s).

### Adding a new interactable painting

1. Place a tile ID (10–16) at the desired grid position in `museumMap`.
2. Add a corresponding `Exhibit` to the matching room array in `projects.ts`. Position in the array maps to painting order (top-left → bottom-right scan).

### Adding a new tile type / room

1. Add a constant to `TILES` in `tilemap.ts`:
   ```ts
   MY_ROOM: 17,
   ```
2. Add a color to `TILE_COLORS`:
   ```ts
   [TILES.MY_ROOM]: "#e94560",
   ```
3. Add it to `INTERACTABLE_TILES`:
   ```ts
   export const INTERACTABLE_TILES: Set<number> = new Set([
     // ...existing,
     TILES.MY_ROOM,
   ]);
   ```
4. Add a new exhibit array and register it in `roomRegistry` (in `projects.ts`):
   ```ts
   export const myRoomExhibits: Exhibit[] = [ /* ... */ ];

   export const roomRegistry: Record<number, Exhibit[]> = {
     // ...existing,
     [TILES.MY_ROOM]: myRoomExhibits,
   };
   ```
5. Place the new tile ID on the map.

---

## Changing Colors & Appearance

- **Tile colors** — edit `TILE_COLORS` in `tilemap.ts`.
- **Player color** — change the `ctx.fillStyle` in the `render()` method of `engine.ts` (currently `#e94560`).
- **Popup style** — edit inline styles in `ExhibitOverlay.tsx`.
- **Dialog prompt** — edit `DialogBox.tsx`.
- **Background color** — the canvas clears to `#0a0a0a` in `engine.ts`; the page background is `#0f0f1a` in `globals.css`.

---

## Audio

Place audio files in `public/assets/audio/`. Reference them with a leading slash:

```ts
{ audio: "/assets/audio/my-sound.mp3" }
```

Audio is played via [Howler.js](https://howlerjs.com/) and fires once on interact.

---

## Deployment

```bash
npm run build
npm run start
```

Or deploy to [Vercel](https://vercel.com) — push the repo and import the project. No extra configuration needed.
