export const TILE_SIZE = 64;

// ── TILE IDs ─────────────────────────────────────────────────────────────────
export const TILES = {
  FLOOR:       0,
  WALL:        1,
  PAINTING:    2,
  DOOR:        3,
  LOBBY:       10,
  MAIN_HALL:   11,
  SKILLS_WING: 12,
  ARCHIVE:     13,
  OFFICE:      14,
  GIFT_SHOP:   15,
  EASTER_EGG:  16,
  VOID:        17, // outside museum bounds — not rendered, treated as solid
} as const;

// Tiles the player can walk on (floor + interactable surface = floor for movement)
export const INTERACTABLE_TILES: Set<number> = new Set([
  TILES.LOBBY,
  TILES.MAIN_HALL,
  TILES.SKILLS_WING,
  TILES.ARCHIVE,
  TILES.OFFICE,
  TILES.GIFT_SHOP,
  TILES.EASTER_EGG,
]);

// ── OBJECT LAYER IDs (furniture / decorations — rendered above floor) ─────────
// These are placed in objectMap, not museumMap.
// Add new furniture types here; give each a color until sprites are ready.
export const OBJECTS = {
  PEDESTAL:     1,  // exhibit pedestal (auto-placed at all interactable tiles except easter egg)
  DISPLAY_CASE: 2,  // glass display case variant
  BENCH:        3,
  TABLE:        4,
  PLANTER:      5,
} as const;

// ── COLORS ───────────────────────────────────────────────────────────────────
// Interactable tiles render as plain FLOOR — the object layer provides the visual.
export const TILE_COLORS: Record<number, string> = {
  [TILES.FLOOR]:       "#2a2a4a",
  [TILES.WALL]:        "#4a4a6a",
  [TILES.PAINTING]:    "#e94560",
  [TILES.DOOR]:        "#0f3460",
  [TILES.LOBBY]:       "#2a2a4a",
  [TILES.MAIN_HALL]:   "#2a2a4a",
  [TILES.SKILLS_WING]: "#2a2a4a",
  [TILES.ARCHIVE]:     "#2a2a4a",
  [TILES.OFFICE]:      "#2a2a4a",
  [TILES.GIFT_SHOP]:   "#2a2a4a",
  [TILES.EASTER_EGG]:  "#2a2a4a", // hidden — looks like plain floor, no object rendered
};

export const OBJECT_COLORS: Record<number, string> = {
  [OBJECTS.PEDESTAL]:     "#8b7355", // warm wood
  [OBJECTS.DISPLAY_CASE]: "#a0d8ef", // pale glass blue
  [OBJECTS.BENCH]:        "#6b4226",
  [OBJECTS.TABLE]:        "#5c3d1e",
  [OBJECTS.PLANTER]:      "#2d5a27",
};

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH DEFINITIONS
//
// northBranches[i] and southBranches[i] share the same horizontal column slot.
// Append one entry to each array to add a new branch pair; map width auto-adjusts.
// ─────────────────────────────────────────────────────────────────────────────

interface BranchDef { tile: number; count: number; }

const northBranches: BranchDef[] = [
  { tile: TILES.SKILLS_WING, count: 6 },
  { tile: TILES.OFFICE,      count: 3 },
  { tile: TILES.GIFT_SHOP,   count: 4 },
];

const southBranches: BranchDef[] = [
  { tile: TILES.LOBBY,     count: 3 },
  { tile: TILES.MAIN_HALL, count: 5 },
  { tile: TILES.ARCHIVE,   count: 6 },
];

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BRANCH_WIDTH    = 11; // side wall + 9-tile interior + side wall
const BRANCH_GAP      = 12; // hallway floor tiles between adjacent branch walls
const LEFT_MARGIN     = 2;  // hallway floor tiles west of first branch
const RIGHT_MARGIN    = 3;  // hallway floor tiles east of last branch
const DOORWAY_HALF    = 2;  // half-span; doorway = DOORWAY_HALF*2+1 = 5 tiles
const ENTRANCE_BUFFER = 5;  // rows between doorway and nearest exhibit tile
const END_BUFFER      = 3;  // rows between end wall and farthest exhibit tile
const EXHIBIT_SPACING = 5;  // rows between consecutive exhibit tiles

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-COMPUTED MAP DIMENSIONS
// Hallway row is derived from max branch depth so the deepest north branch
// starts at row 1 (one row inside the outer void).
// ─────────────────────────────────────────────────────────────────────────────

const N = northBranches.length;
const branchDepth = (n: number) => END_BUFFER + (n - 1) * EXHIBIT_SPACING + 1 + ENTRANCE_BUFFER;
const maxDepth = Math.max(
  ...northBranches.map(b => branchDepth(b.count)),
  ...southBranches.map(b => branchDepth(b.count)),
);

// northTopRow = NORTH_BRANCH_BOTTOM - depth + 1 >= 1
// ↔ HALLWAY_ROW_TOP - 2 - maxDepth + 1 >= 1  →  HALLWAY_ROW_TOP >= maxDepth + 2
const HALLWAY_ROW_TOP    = maxDepth + 2;
const HALLWAY_ROW_BOTTOM = HALLWAY_ROW_TOP + 9; // 10-row hallway
const NORTH_ENTRANCE_ROW  = HALLWAY_ROW_TOP - 1;
const SOUTH_ENTRANCE_ROW  = HALLWAY_ROW_BOTTOM + 1;
const NORTH_BRANCH_BOTTOM = NORTH_ENTRANCE_ROW - 1;
const SOUTH_BRANCH_TOP    = SOUTH_ENTRANCE_ROW + 1;

const COLS = 1 + LEFT_MARGIN + N * BRANCH_WIDTH + (N - 1) * BRANCH_GAP + RIGHT_MARGIN + 1;
const ROWS = SOUTH_BRANCH_TOP + maxDepth + 2;

// Column helpers for branch index i
const branchLeftWall  = (i: number) => 1 + LEFT_MARGIN + i * (BRANCH_WIDTH + BRANCH_GAP);
const branchRightWall = (i: number) => branchLeftWall(i) + BRANCH_WIDTH - 1;
const branchCenterCol = (i: number) => branchLeftWall(i) + Math.floor(BRANCH_WIDTH / 2);

export const PLAYER_SPAWN_COL = branchCenterCol(0);
export const PLAYER_SPAWN_ROW = Math.floor((HALLWAY_ROW_TOP + HALLWAY_ROW_BOTTOM) / 2) + 1;

// ─────────────────────────────────────────────────────────────────────────────
// MAP BUILDER
//
// 1. Initialise every cell to VOID.
// 2. Carve FLOOR for hallway, doorways, and branch interiors.
// 3. Stamp exhibit tiles and the easter egg.
// 4. Adjacency pass: any VOID tile with at least one non-VOID neighbour (8-dir)
//    becomes WALL. Uses a snapshot so newly-created walls don't propagate.
//    Result: exactly one tile of wall surrounds every floor region; everything
//    further out stays VOID — the map has the museum silhouette, not a rectangle.
// ─────────────────────────────────────────────────────────────────────────────

function buildMap(): number[][] {
  const m: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(TILES.VOID));

  const fill = (r1: number, c1: number, r2: number, c2: number, tile: number) => {
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++)
        m[r][c] = tile;
  };
  const set = (r: number, c: number, tile: number) => { m[r][c] = tile; };

  // Hallway
  fill(HALLWAY_ROW_TOP, 1, HALLWAY_ROW_BOTTOM, COLS - 2, TILES.FLOOR);

  // Doorways
  for (let i = 0; i < N; i++) {
    const cc = branchCenterCol(i);
    fill(NORTH_ENTRANCE_ROW, cc - DOORWAY_HALF, NORTH_ENTRANCE_ROW, cc + DOORWAY_HALF, TILES.FLOOR);
    fill(SOUTH_ENTRANCE_ROW, cc - DOORWAY_HALF, SOUTH_ENTRANCE_ROW, cc + DOORWAY_HALF, TILES.FLOOR);
  }

  // Branch interiors, exhibit tiles
  for (let i = 0; i < N; i++) {
    const intLeft  = branchLeftWall(i) + 1;
    const intRight = branchRightWall(i) - 1;
    const cc       = branchCenterCol(i);

    const nb = northBranches[i];
    const sb = southBranches[i];

    const northTopRow = NORTH_BRANCH_BOTTOM - branchDepth(nb.count) + 1;
    fill(northTopRow, intLeft, NORTH_BRANCH_BOTTOM, intRight, TILES.FLOOR);
    const northFirstExhibit = northTopRow + END_BUFFER;
    for (let j = 0; j < nb.count; j++)
      set(northFirstExhibit + j * EXHIBIT_SPACING, cc, nb.tile);

    const southBottomRow = SOUTH_BRANCH_TOP + branchDepth(sb.count) - 1;
    fill(SOUTH_BRANCH_TOP, intLeft, southBottomRow, intRight, TILES.FLOOR);
    // Offset -2 corrects the 3-D asymmetry: north pedestals face south (toward
    // the hallway) so the first obstacle is at ENTRANCE_BUFFER-1 rows in.
    // South pedestals face north (away from hallway) by the same rule, which
    // would place them at ENTRANCE_BUFFER+1 rows in — 2 too far.  Subtracting
    // 2 here puts both directions' first pedestal at the same depth.
    const southFirstExhibit = SOUTH_BRANCH_TOP + ENTRANCE_BUFFER - 2;
    for (let j = 0; j < sb.count; j++)
      set(southFirstExhibit + j * EXHIBIT_SPACING, cc, sb.tile);
  }

  // Easter egg — hidden in hallway, looks like plain floor (no object placed on it)
  set(Math.floor((HALLWAY_ROW_TOP + HALLWAY_ROW_BOTTOM) / 2), 2, TILES.EASTER_EGG);

  // Adjacency pass — snapshot-based so fresh WALL tiles don't cascade
  const snap = m.map(row => row.slice());
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (snap[r][c] !== TILES.VOID) continue;
      outer: for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && snap[nr][nc] !== TILES.VOID) {
            m[r][c] = TILES.WALL;
            break outer;
          }
        }
      }
    }
  }

  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// OBJECT LAYER BUILDER
//
// Scans museumMap and auto-places a PEDESTAL at every interactable tile
// (except EASTER_EGG — it stays visually hidden).
// To place additional furniture, mutate objectMap after export or extend this
// function with a manual placement table.
// ─────────────────────────────────────────────────────────────────────────────

function buildObjectMap(m: number[][]): (number | null)[][] {
  const obj: (number | null)[][] = Array.from({ length: m.length }, () =>
    Array(m[0].length).fill(null)
  );
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[0].length; c++) {
      if (INTERACTABLE_TILES.has(m[r][c]) && m[r][c] !== TILES.EASTER_EGG) {
        obj[r][c] = OBJECTS.PEDESTAL;
      }
    }
  }
  return obj;
}

export const museumMap: number[][] = buildMap();
export const objectMap: (number | null)[][] = buildObjectMap(museumMap);

// ─────────────────────────────────────────────────────────────────────────────
// SOLID MAP
//
// Decouples collision from tile identity so sprites can extend beyond their
// tile bounds without affecting physics.
//
// Rules:
//   WALL / VOID          → always solid
//   interactable tile    → walkable (player walks "behind" the exhibit)
//   one row south of a pedestal → solid (the visible front face of the object)
//
// The one-row-south rule creates a top-down 3D effect: the player can occupy
// the exhibit tile (visually "behind" the display), but is blocked from
// walking in front of it.  Wall sprites that extend one tile upward will be
// rendered on top of whatever occupies that tile, handled naturally by the
// engine's north-to-south draw order.
// ─────────────────────────────────────────────────────────────────────────────

function buildSolidMap(m: number[][], obj: (number | null)[][]): boolean[][] {
  const solid = m.map(row =>
    row.map(tile => tile === TILES.WALL || tile === TILES.VOID)
  );
  for (let r = 0; r < m.length - 1; r++) {
    for (let c = 0; c < m[0].length; c++) {
      if (obj[r][c] === OBJECTS.PEDESTAL) {
        solid[r + 1][c] = true;
      }
    }
  }
  return solid;
}

export const solidMap: boolean[][] = buildSolidMap(museumMap, objectMap);

export function getTileAt(worldX: number, worldY: number): number {
  const col = Math.floor(worldX / TILE_SIZE);
  const row = Math.floor(worldY / TILE_SIZE);
  if (row < 0 || row >= museumMap.length || col < 0 || col >= museumMap[0].length) {
    return TILES.VOID;
  }
  return museumMap[row][col];
}

export function setTileAt(col: number, row: number, tile: number) {
  if (row >= 0 && row < museumMap.length && col >= 0 && col < museumMap[0].length) {
    museumMap[row][col] = tile;
  }
}

export const MAP_WIDTH  = museumMap[0].length * TILE_SIZE;
export const MAP_HEIGHT = museumMap.length    * TILE_SIZE;
