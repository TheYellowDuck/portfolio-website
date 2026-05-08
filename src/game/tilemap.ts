// TILE_SIZE = 64px -> hallway = 10 rows x 64px = 640px (~59% of 1080px screen)
export const TILE_SIZE = 64;

export const TILES = {
  FLOOR: 0,
  WALL: 1,
  PAINTING: 2,
  DOOR: 3,
  LOBBY: 10,
  MAIN_HALL: 11,
  SKILLS_WING: 12,
  ARCHIVE: 13,
  OFFICE: 14,
  GIFT_SHOP: 15,
  EASTER_EGG: 16,
} as const;

export const INTERACTABLE_TILES: Set<number> = new Set([
  TILES.LOBBY,
  TILES.MAIN_HALL,
  TILES.SKILLS_WING,
  TILES.ARCHIVE,
  TILES.OFFICE,
  TILES.GIFT_SHOP,
  TILES.EASTER_EGG,
]);

export const TILE_COLORS: Record<number, string> = {
  [TILES.FLOOR]:       "#2a2a4a",
  [TILES.WALL]:        "#4a4a6a",
  [TILES.PAINTING]:    "#e94560",
  [TILES.DOOR]:        "#0f3460",
  [TILES.LOBBY]:       "#e94560",
  [TILES.MAIN_HALL]:   "#e94560",
  [TILES.SKILLS_WING]: "#e94560",
  [TILES.ARCHIVE]:     "#e94560",
  [TILES.OFFICE]:      "#e94560",
  [TILES.GIFT_SHOP]:   "#e94560",
  [TILES.EASTER_EGG]:  "#e94560",
};

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH DEFINITIONS
//
// northBranches[i] and southBranches[i] share the same horizontal column slot.
// To add a new branch pair, append one entry to each array — map size auto-adjusts.
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
const END_BUFFER      = 2;  // rows between end wall and farthest exhibit tile
const EXHIBIT_SPACING = 5;  // rows between consecutive exhibit tiles

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-COMPUTED MAP DIMENSIONS
// Hallway row position is derived from max branch depth so the deepest north
// branch always starts at row 1 (just inside the outer wall).
// ─────────────────────────────────────────────────────────────────────────────

const N = northBranches.length;
const branchDepth = (n: number) => END_BUFFER + (n - 1) * EXHIBIT_SPACING + 1 + ENTRANCE_BUFFER;
const maxDepth = Math.max(
  ...northBranches.map(b => branchDepth(b.count)),
  ...southBranches.map(b => branchDepth(b.count)),
);

// northTopRow = NORTH_BRANCH_BOTTOM - depth + 1 >= 1
// ↔ HALLWAY_ROW_TOP - 2 - maxDepth + 1 >= 1
// ↔ HALLWAY_ROW_TOP >= maxDepth + 2
const HALLWAY_ROW_TOP    = maxDepth + 2;
const HALLWAY_ROW_BOTTOM = HALLWAY_ROW_TOP + 9;  // 10-row hallway
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

// Exported so engine.ts can spawn the player without hardcoding row numbers
export const PLAYER_SPAWN_COL = branchCenterCol(0);
export const PLAYER_SPAWN_ROW = Math.floor((HALLWAY_ROW_TOP + HALLWAY_ROW_BOTTOM) / 2) + 1;

function buildMap(): number[][] {
  const m: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(TILES.WALL));

  const fill = (r1: number, c1: number, r2: number, c2: number, tile: number) => {
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++)
        m[r][c] = tile;
  };
  const set = (r: number, c: number, tile: number) => { m[r][c] = tile; };

  // ── MAIN HALLWAY ──────────────────────────────────────────────────────────
  fill(HALLWAY_ROW_TOP, 1, HALLWAY_ROW_BOTTOM, COLS - 2, TILES.FLOOR);

  // ── DOORWAYS (5 tiles wide, centered on each branch) ─────────────────────
  for (let i = 0; i < N; i++) {
    const cc = branchCenterCol(i);
    fill(NORTH_ENTRANCE_ROW, cc - DOORWAY_HALF, NORTH_ENTRANCE_ROW, cc + DOORWAY_HALF, TILES.FLOOR);
    fill(SOUTH_ENTRANCE_ROW, cc - DOORWAY_HALF, SOUTH_ENTRANCE_ROW, cc + DOORWAY_HALF, TILES.FLOOR);
  }

  // ── BRANCH INTERIORS & EXHIBITS ───────────────────────────────────────────
  for (let i = 0; i < N; i++) {
    const intLeft  = branchLeftWall(i) + 1;
    const intRight = branchRightWall(i) - 1;
    const cc       = branchCenterCol(i);

    const nb = northBranches[i];
    const sb = southBranches[i];

    // North branch: goes upward from NORTH_BRANCH_BOTTOM
    const northTopRow = NORTH_BRANCH_BOTTOM - branchDepth(nb.count) + 1;
    fill(northTopRow, intLeft, NORTH_BRANCH_BOTTOM, intRight, TILES.FLOOR);
    const northFirstExhibit = northTopRow + END_BUFFER;
    for (let j = 0; j < nb.count; j++)
      set(northFirstExhibit + j * EXHIBIT_SPACING, cc, nb.tile);

    // South branch: goes downward from SOUTH_BRANCH_TOP
    const southBottomRow = SOUTH_BRANCH_TOP + branchDepth(sb.count) - 1;
    fill(SOUTH_BRANCH_TOP, intLeft, southBottomRow, intRight, TILES.FLOOR);
    const southFirstExhibit = SOUTH_BRANCH_TOP + ENTRANCE_BUFFER;
    for (let j = 0; j < sb.count; j++)
      set(southFirstExhibit + j * EXHIBIT_SPACING, cc, sb.tile);
  }

  // ── EASTER EGG ────────────────────────────────────────────────────────────
  // Hidden at the far-left end of the main hallway (col 2, always inside LEFT_MARGIN)
  set(Math.floor((HALLWAY_ROW_TOP + HALLWAY_ROW_BOTTOM) / 2), 2, TILES.EASTER_EGG);

  return m;
}

export const museumMap: number[][] = buildMap();

export function getTileAt(worldX: number, worldY: number): number {
  const col = Math.floor(worldX / TILE_SIZE);
  const row = Math.floor(worldY / TILE_SIZE);
  if (row < 0 || row >= museumMap.length || col < 0 || col >= museumMap[0].length) {
    return TILES.WALL;
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
