import { COLORS } from "@/styles/theme";

export const TILE_SIZE = 64;

// ── TILE IDs ─────────────────────────────────────────────────────────────────
export const TILES = {
  FLOOR:       0,
  WALL:        1,
  PAINTING:    2,  // defined but not currently placed on the map — reserved for future wall art
  DOOR:        3,
  LOBBY:       10, // kept for compat; no longer assigned to a branch — do not reuse ID 10
  MAIN_HALL:   11,
  SKILLS_WING: 12,
  ARCHIVE:     13,
  OFFICE:      14,
  GIFT_SHOP:   15,
  EASTER_EGG:  16,
  VOID:        17, // outside museum bounds — not rendered, treated as solid
  EXPERIENCE:  18,
  RESUME:      19, // standalone hallway pedestal (resume / CV)
} as const;

export const INTERACTABLE_TILES: Set<number> = new Set([
  TILES.MAIN_HALL,
  TILES.SKILLS_WING,
  TILES.ARCHIVE,
  TILES.OFFICE,
  TILES.GIFT_SHOP,
  TILES.EASTER_EGG,
  TILES.EXPERIENCE,
  TILES.RESUME,
]);

// ── OBJECT LAYER IDs (furniture / decorations — rendered above floor) ─────────
export const OBJECTS = {
  PEDESTAL:     1,  // exhibit pedestal (auto-placed at all interactable tiles except easter egg)
  DISPLAY_CASE: 2,  // glass display case variant
  BENCH:        3,
  TABLE:        4,
  PLANTER:      5,
  DESK:         6,  // workspace desk (place manually in objectMap)
} as const;

// ── COLORS ───────────────────────────────────────────────────────────────────
// Interactable tiles render as plain FLOOR — the object layer provides the visual.
export const TILE_COLORS: Record<number, string> = {
  [TILES.FLOOR]:       COLORS.FLOOR,
  [TILES.WALL]:        COLORS.WALL,
  [TILES.PAINTING]:    COLORS.SAGE,
  [TILES.DOOR]:        COLORS.DOOR,
  [TILES.LOBBY]:       COLORS.FLOOR,
  [TILES.MAIN_HALL]:   COLORS.FLOOR,
  [TILES.SKILLS_WING]: COLORS.FLOOR,
  [TILES.ARCHIVE]:     COLORS.FLOOR,
  [TILES.OFFICE]:      COLORS.FLOOR,
  [TILES.GIFT_SHOP]:   COLORS.FLOOR,
  [TILES.EASTER_EGG]:  COLORS.FLOOR,
  [TILES.EXPERIENCE]:  COLORS.FLOOR,
  [TILES.RESUME]:      COLORS.FLOOR,
};

export const OBJECT_COLORS: Record<number, string> = {
  [OBJECTS.PEDESTAL]:     COLORS.PEDESTAL,
  [OBJECTS.DISPLAY_CASE]: COLORS.DISPLAY_CASE,
  [OBJECTS.BENCH]:        COLORS.WOOD_DARK,
  [OBJECTS.TABLE]:        COLORS.WOOD_DARK,
  [OBJECTS.PLANTER]:      COLORS.PLANTER,
  [OBJECTS.DESK]:         COLORS.DESK,
};

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH DEFINITIONS
//
// northBranches[i] and southBranches[i] share the same horizontal column slot.
// Append one entry to each array to add a branch pair; map width auto-adjusts.
//
// Layout (T = top/north, B = bottom/south):
//   T: Experience | Projects | Skills
//   B: Archive    | About Me | Links
// ─────────────────────────────────────────────────────────────────────────────

interface BranchDef { tile: number; count: number; }

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

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BRANCH_WIDTH    = 11; // side wall + 9-tile interior + side wall
const BRANCH_GAP      = 10; // hallway floor tiles between adjacent branch walls
const LEFT_MARGIN     = 2;  // hallway floor tiles west of first branch
const RIGHT_MARGIN    = 7;  // hallway floor tiles east of last branch (desk space)
const DOORWAY_HALF    = 2;  // half-span; doorway = DOORWAY_HALF*2+1 = 5 tiles
const ENTRANCE_BUFFER = 4;  // rows between doorway and nearest exhibit tile
const END_BUFFER      = 2;  // rows between end wall and farthest exhibit tile
const EXHIBIT_SPACING = 4;  // rows between consecutive exhibit tiles

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-COMPUTED MAP DIMENSIONS
// ─────────────────────────────────────────────────────────────────────────────

const N = northBranches.length;
const branchDepth = (n: number) => END_BUFFER + (n - 1) * EXHIBIT_SPACING + 1 + ENTRANCE_BUFFER;
const maxDepth = Math.max(
  ...northBranches.map(b => branchDepth(b.count)),
  ...southBranches.map(b => branchDepth(b.count)),
);

const HALLWAY_ROW_TOP    = maxDepth + 2;
const HALLWAY_ROW_BOTTOM = HALLWAY_ROW_TOP + 8;
const NORTH_ENTRANCE_ROW  = HALLWAY_ROW_TOP - 1;
const SOUTH_ENTRANCE_ROW  = HALLWAY_ROW_BOTTOM + 1;
const NORTH_BRANCH_BOTTOM = NORTH_ENTRANCE_ROW - 1;
const SOUTH_BRANCH_TOP    = SOUTH_ENTRANCE_ROW + 1;

const COLS = 1 + LEFT_MARGIN + N * BRANCH_WIDTH + (N - 1) * BRANCH_GAP + RIGHT_MARGIN + 1;
const ROWS = SOUTH_BRANCH_TOP + maxDepth + 2;

const branchLeftWall  = (i: number) => 1 + LEFT_MARGIN + i * (BRANCH_WIDTH + BRANCH_GAP);
const branchRightWall = (i: number) => branchLeftWall(i) + BRANCH_WIDTH - 1;
const branchCenterCol = (i: number) => branchLeftWall(i) + Math.floor(BRANCH_WIDTH / 2);

export const PLAYER_SPAWN_COL = branchCenterCol(0);
export const PLAYER_SPAWN_ROW = Math.floor((HALLWAY_ROW_TOP + HALLWAY_ROW_BOTTOM) / 2);


function buildMap(): number[][] {
  const m: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(TILES.VOID));

  const fill = (r1: number, c1: number, r2: number, c2: number, tile: number) => {
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++)
        m[r][c] = tile;
  };
  const set = (r: number, c: number, tile: number) => { m[r][c] = tile; };

  // Hallway
  // The right margin (cols after last branch) doubles as the desk alcove.
  fill(HALLWAY_ROW_TOP, 1, HALLWAY_ROW_BOTTOM, COLS - 2, TILES.FLOOR);

  // Doorways
  for (let i = 0; i < N; i++) {
    const cc = branchCenterCol(i);
    fill(NORTH_ENTRANCE_ROW, cc - DOORWAY_HALF, NORTH_ENTRANCE_ROW, cc + DOORWAY_HALF, TILES.FLOOR);
    fill(SOUTH_ENTRANCE_ROW, cc - DOORWAY_HALF, SOUTH_ENTRANCE_ROW, cc + DOORWAY_HALF, TILES.FLOOR);
  }

  // Branch interiors + exhibit tiles
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
    // -2 corrects the 3-D pedestal asymmetry so both directions place their
    // first pedestal at ENTRANCE_BUFFER-1 rows from the doorway.
    const southFirstExhibit = SOUTH_BRANCH_TOP + ENTRANCE_BUFFER - 2;
    for (let j = 0; j < sb.count; j++)
      set(southFirstExhibit + j * EXHIBIT_SPACING, cc, sb.tile);
  }

  // Resume pedestal — standalone interactable in the hallway
  set(PLAYER_SPAWN_ROW - 1, PLAYER_SPAWN_COL + 2, TILES.RESUME);

  // Easter egg — hidden in hallway, looks like plain floor
  set(Math.floor((HALLWAY_ROW_TOP + HALLWAY_ROW_BOTTOM) / 2) - 1, 2, TILES.EASTER_EGG);

  // Adjacency pass — VOID tiles adjacent to any non-VOID become WALL.
  // Snapshot-based so freshly-created walls don't cascade.
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

export const museumMap: number[][] = buildMap();
export const objectMap: (number | null)[][] = buildObjectMap(museumMap);
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

export function setSolidAt(col: number, row: number, solid: boolean) {
  if (row >= 0 && row < solidMap.length && col >= 0 && col < solidMap[0].length) {
    solidMap[row][col] = solid;
  }
}

export const MAP_WIDTH  = museumMap[0].length * TILE_SIZE;
export const MAP_HEIGHT = museumMap.length    * TILE_SIZE;
