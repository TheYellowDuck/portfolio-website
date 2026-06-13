import { COLORS } from "@/styles/theme";
import { TILES } from "./tile-ids";
import {
  experienceExhibits,
  mainHallExhibits,
  archiveExhibits,
  officeExhibits,
  giftShopExhibits,
} from "@/data/projects";

export { TILES };  // re-export so existing imports from this file keep working
export const TILE_SIZE = 64;

export const INTERACTABLE_TILES: Set<number> = new Set([
  TILES.MAIN_HALL,
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
// The longer side is "primary" (defines horizontal layout).
// The shorter side is "secondary" — each branch is centered between two adjacent
// primary doorways. Keep |north.length - south.length| ≤ 1 for best results.
//
// Layout (T = top/north, B = bottom/south):
//   T: Experience | Projects | Archive
//   B: About Me   | Links    |
// ─────────────────────────────────────────────────────────────────────────────

interface BranchDef { tile: number; count: number; label: string; }

const northBranches: BranchDef[] = [
  { tile: TILES.EXPERIENCE, count: experienceExhibits.length, label: "Experience" },
  { tile: TILES.MAIN_HALL,  count: mainHallExhibits.length,  label: "Projects" },
  { tile: TILES.ARCHIVE,    count: archiveExhibits.length,   label: "Archive" },
];

const southBranches: BranchDef[] = [
  { tile: TILES.OFFICE,    count: officeExhibits.length,    label: "About Me" },
  { tile: TILES.GIFT_SHOP, count: giftShopExhibits.length,  label: "Links" },
];

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const COL_MARGIN      = 2;  // tiles from interior edge to first/last pedestal column
const COL_GAP         = 3;  // tiles between adjacent pedestal column centers
const ROW_GAP         = 4;  // tiles between adjacent pedestal row centers
const ENTRANCE_BUFFER = 4;  // rows between connector entrance and nearest exhibit row
const END_BUFFER      = 2;  // rows between end wall and farthest exhibit row
const CONNECTOR_LEN   = 2;  // rows of narrow corridor between main hallway and each branch room
const MIN_BRANCH_GAP  = 5;  // minimum floor tiles between adjacent branch walls
const LEFT_MARGIN     = 2;  // hallway floor tiles west of first branch
const RIGHT_MARGIN    = 4;  // hallway floor tiles east of last branch (desk space)
const DOORWAY_HALF    = 2;  // half-span; connector/doorway = DOORWAY_HALF*2+1 = 5 tiles wide

// ─────────────────────────────────────────────────────────────────────────────
// GRID MATH — each room's pedestals are arranged in a near-square grid
// ─────────────────────────────────────────────────────────────────────────────

function gridDims(count: number): { gc: number; gr: number } {
  const gc = Math.ceil(Math.sqrt(count));
  const gr = Math.ceil(count / gc);
  return { gc, gr };
}

// Even gc (2, 4, …) uses COL_GAP+1 so the room width stays odd in all cases.
// An odd room width means the room center is always a whole tile, which makes
// the connector align exactly with the center of the pedestal group.
// Odd gc (1, 3, …) uses COL_GAP as-is — the pedestal center already lands on a whole tile.
function effectiveColGap(gc: number): number {
  return gc % 2 === 0 ? COL_GAP + 1 : COL_GAP;
}

// Interior width is always odd so floor(intWidth/2) is the exact center tile.
function calcInteriorWidth(gc: number): number {
  if (gc === 1) return 7;
  const gap = effectiveColGap(gc);
  return 2 * COL_MARGIN + (gc - 1) * gap + 1;
}

function calcBranchWidth(count: number): number {
  return 2 + calcInteriorWidth(gridDims(count).gc);
}

// Branch depth (rows) needed to fit gr pedestal rows with entrance/end buffers.
function calcBranchDepth(count: number): number {
  const { gr } = gridDims(count);
  return END_BUFFER + (gr - 1) * ROW_GAP + 1 + ENTRANCE_BUFFER;
}

// Pedestal columns centered on the room's center tile.
// startCol anchors the group so its midpoint = floor(intWidth/2) for all gc.
function pedestalCols(intLeft: number, intWidth: number, gc: number): number[] {
  const gap      = effectiveColGap(gc);
  const startCol = Math.floor(intWidth / 2) - Math.floor((gc - 1) * gap / 2);
  return Array.from({ length: gc }, (_, k) => intLeft + startCol + k * gap);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-COMPUTED MAP DIMENSIONS
// ─────────────────────────────────────────────────────────────────────────────

const N = northBranches.length;
const M = southBranches.length;

const northWidths = northBranches.map(b => calcBranchWidth(b.count));
const southWidths = southBranches.map(b => calcBranchWidth(b.count));

// The longer side is "primary" (defines layout width).
// The shorter side is "secondary" (centered between adjacent primary pairs).
const longIsNorth = N >= M;
const longWidths  = longIsNorth ? northWidths : southWidths;
const shortWidths = longIsNorth ? southWidths : northWidths;
const L = longIsNorth ? N : M;
const S = longIsNorth ? M : N;

// Minimum center-to-center spacing: just enough that same-side walls are MIN_BRANCH_GAP apart.
// Opposite-side rooms never share row space, so cross-hallway column overlap is harmless.
// Equal spacing across all pairs → mutual centering on both sides.
const rawCenterSpacing = (i: number): number =>
  MIN_BRANCH_GAP + Math.ceil(longWidths[i] / 2) + Math.floor(longWidths[i + 1] / 2);

const rawD = Math.max(0, ...Array.from({ length: Math.max(0, L - 1) }, (_, i) => rawCenterSpacing(i)));
const D    = rawD % 2 === 1 ? rawD + 1 : rawD;  // round up to even for exact integer midpoints

// Per-pair wall gaps derived from the uniform center spacing.
const pairGaps: number[] = Array.from({ length: Math.max(0, L - 1) }, (_, i) =>
  D - Math.ceil(longWidths[i] / 2) - Math.floor(longWidths[i + 1] / 2)
);

// Long-side left walls and centers.
const longLeftWalls: number[] = [];
{
  let x = 1 + LEFT_MARGIN;
  for (let i = 0; i < L; i++) {
    longLeftWalls.push(x);
    x += longWidths[i] + (pairGaps[i] ?? 0);
  }
}
const longCenterCols = longLeftWalls.map((lw, i) => lw + Math.floor(longWidths[i] / 2));

// Short-side branches centered between adjacent long-side pairs.
const shortCenterCols = Array.from({ length: S }, (_, i) =>
  S >= L
    ? longCenterCols[i]
    : Math.round((longCenterCols[i] + longCenterCols[i + 1]) / 2)
);
const shortLeftWalls = shortCenterCols.map((cc, i) =>
  cc - Math.floor(shortWidths[i] / 2)
);

// Map back to north/south.
const northLeftWalls  = longIsNorth ? longLeftWalls   : shortLeftWalls;
const northCenterCols = longIsNorth ? longCenterCols  : shortCenterCols;
const southCenterCols = longIsNorth ? shortCenterCols : longCenterCols;
const southLeftWalls  = longIsNorth ? shortLeftWalls  : longLeftWalls;

const maxNorthDepth = Math.max(...northBranches.map(b => calcBranchDepth(b.count)));
const maxSouthDepth = southBranches.length
  ? Math.max(...southBranches.map(b => calcBranchDepth(b.count)))
  : 0;

const HALLWAY_ROW_TOP    = maxNorthDepth + CONNECTOR_LEN + 2;
const HALLWAY_ROW_BOTTOM = HALLWAY_ROW_TOP + 6;
const NORTH_ENTRANCE_ROW  = HALLWAY_ROW_TOP - 1;
const SOUTH_ENTRANCE_ROW  = HALLWAY_ROW_BOTTOM + 1;
// Branch rooms sit CONNECTOR_LEN + 1 rows away from the main hallway edge.
const NORTH_BRANCH_BOTTOM = NORTH_ENTRANCE_ROW - CONNECTOR_LEN - 1;
const SOUTH_BRANCH_TOP    = SOUTH_ENTRANCE_ROW + CONNECTOR_LEN + 1;

const COLS = 1 + LEFT_MARGIN
  + longWidths.reduce((a, b) => a + b, 0)
  + pairGaps.reduce((a, b) => a + b, 0)
  + RIGHT_MARGIN + 1;
const ROWS = SOUTH_BRANCH_TOP + maxSouthDepth + 2;

const FIRST_NORTH_CENTER_COL = northCenterCols[0];
const HALLWAY_CENTER_ROW = Math.floor((HALLWAY_ROW_TOP + HALLWAY_ROW_BOTTOM) / 2);

export const PLAYER_SPAWN_COL = FIRST_NORTH_CENTER_COL - 1;
export const PLAYER_SPAWN_ROW = HALLWAY_CENTER_ROW;

export const NPC_COL = COLS - 5;
export const NPC_ROW = HALLWAY_CENTER_ROW;

export interface BranchLabel {
  label: string;
  col: number;    // center column of the branch room (tiles)
  row: number;    // center row of the branch room (tiles)
  tile: number;   // tile type that identifies this branch
  rowMin: number; // inclusive row bounds of the room interior
  rowMax: number;
  colMin: number; // inclusive col bounds of the room interior
  colMax: number;
}

export const branchLabels: BranchLabel[] = [
  ...northBranches.map((b, i) => {
    const depth  = calcBranchDepth(b.count);
    const topRow = NORTH_BRANCH_BOTTOM - depth + 1;
    return {
      label:  b.label,
      col:    northCenterCols[i],
      row:    topRow - 3,
      tile:   b.tile,
      rowMin: topRow,
      rowMax: NORTH_BRANCH_BOTTOM,
      colMin: northLeftWalls[i] + 1,
      colMax: northLeftWalls[i] + northWidths[i] - 2,
    };
  }),
  ...southBranches.map((b, i) => {
    const depth     = calcBranchDepth(b.count);
    const bottomRow = SOUTH_BRANCH_TOP + depth - 1;
    return {
      label:  b.label,
      col:    southCenterCols[i],
      row:    bottomRow + 3,
      tile:   b.tile,
      rowMin: SOUTH_BRANCH_TOP,
      rowMax: bottomRow,
      colMin: southLeftWalls[i] + 1,
      colMax: southLeftWalls[i] + southWidths[i] - 2,
    };
  }),
];


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

  // North connectors — narrow corridor from each branch room to the main hallway.
  for (let i = 0; i < N; i++) {
    const cc = northCenterCols[i];
    fill(NORTH_BRANCH_BOTTOM + 1, cc - DOORWAY_HALF, NORTH_ENTRANCE_ROW, cc + DOORWAY_HALF, TILES.FLOOR);
  }

  // South connectors
  for (let i = 0; i < M; i++) {
    const cc = southCenterCols[i];
    fill(SOUTH_ENTRANCE_ROW, cc - DOORWAY_HALF, SOUTH_BRANCH_TOP - 1, cc + DOORWAY_HALF, TILES.FLOOR);
  }

  // North branch interiors + grid-arranged exhibit tiles
  for (let i = 0; i < N; i++) {
    const intLeft  = northLeftWalls[i] + 1;
    const intRight = northLeftWalls[i] + northWidths[i] - 2;
    const intWidth = northWidths[i] - 2;
    const nb       = northBranches[i];
    const { gc, gr } = gridDims(nb.count);
    const depth    = calcBranchDepth(nb.count);

    const northTopRow = NORTH_BRANCH_BOTTOM - depth + 1;
    fill(northTopRow, intLeft, NORTH_BRANCH_BOTTOM, intRight, TILES.FLOOR);

    // Pedestals fill top→bottom, left→right — matches the scanner in interactables.ts.
    const firstRow = northTopRow + END_BUFFER;
    const cols     = pedestalCols(intLeft, intWidth, gc);
    let idx = 0;
    for (let row = 0; row < gr && idx < nb.count; row++) {
      for (let col = 0; col < gc && idx < nb.count; col++, idx++) {
        set(firstRow + row * ROW_GAP, cols[col], nb.tile);
      }
    }
  }

  // South branch interiors + grid-arranged exhibit tiles
  for (let i = 0; i < M; i++) {
    const intLeft  = southLeftWalls[i] + 1;
    const intRight = southLeftWalls[i] + southWidths[i] - 2;
    const intWidth = southWidths[i] - 2;
    const sb       = southBranches[i];
    const { gc, gr } = gridDims(sb.count);
    const depth    = calcBranchDepth(sb.count);

    const southBottomRow = SOUTH_BRANCH_TOP + depth - 1;
    fill(SOUTH_BRANCH_TOP, intLeft, southBottomRow, intRight, TILES.FLOOR);

    // -2 corrects the 3-D pedestal asymmetry so both directions place the
    // first pedestal at ENTRANCE_BUFFER-1 rows from the doorway.
    const firstRow = SOUTH_BRANCH_TOP + ENTRANCE_BUFFER - 2;
    const cols     = pedestalCols(intLeft, intWidth, gc);
    let idx = 0;
    for (let row = 0; row < gr && idx < sb.count; row++) {
      for (let col = 0; col < gc && idx < sb.count; col++, idx++) {
        set(firstRow + row * ROW_GAP, cols[col], sb.tile);
      }
    }
  }

  // Resume pedestal — center of first north branch
  set(HALLWAY_CENTER_ROW - 1, FIRST_NORTH_CENTER_COL, TILES.RESUME);

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
  // NPC desk collision — 1 tile tall, 3 tiles wide at the base of the sprite
  for (let dc = -1; dc <= 1; dc++) {
    const c = NPC_COL + dc;
    if (c >= 0 && c < m[0].length) solid[NPC_ROW][c] = true;
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
