// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

// Grid A* over the tile `solidMap`, for click-to-move. 8-directional with diagonal
// corner-cutting prevention so the player never tries to squeeze through a wall corner.

import { solidMap } from "./tilemap";
import { isSolid } from "./collision";

export interface Cell { col: number; row: number; }

// [dCol, dRow, cost]
const DIRS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

// Player collision box half-size in tiles (the rect is ~0.25; padded a touch). The
// box is centered on the path point, so clearance is symmetric — used to keep BOTH
// A* diagonals and smoothed lines clear so the box never catches on a corner.
const HALF = 0.3;

/** A tile the player can't path through — exactly the collision map (walls/void
 *  + whatever has been marked solid, e.g. pedestal bases). Pathfinding mirrors
 *  physics: only real collisions are no-go. */
function blocked(col: number, row: number): boolean {
  return isSolid(col, row);
}

/**
 * A* from `start` to `goal` over walkable tiles. Returns the waypoints after the
 * start (goal last), an empty array if already there, or null if the goal is solid
 * or unreachable. The map is small, so a plain open-set scan is plenty fast.
 */
export function findPath(start: Cell, goal: Cell): Cell[] | null {
  const rows = solidMap.length;
  const cols = solidMap[0]?.length ?? 0;
  const inBounds = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows;

  if (!inBounds(goal.col, goal.row) || blocked(goal.col, goal.row)) return null;
  if (start.col === goal.col && start.row === goal.row) return [];

  const key = (c: number, r: number) => r * cols + c;
  const startK = key(start.col, start.row);
  const goalK = key(goal.col, goal.row);

  const octile = (c: number, r: number) => {
    const dc = Math.abs(c - goal.col), dr = Math.abs(r - goal.row);
    return dc + dr + (Math.SQRT2 - 2) * Math.min(dc, dr);
  };

  const g = new Map<number, number>([[startK, 0]]);
  const cameFrom = new Map<number, number>();
  const open = new Set<number>([startK]);

  while (open.size) {
    let cur = -1, bestF = Infinity;
    for (const k of open) {
      const c = k % cols, r = (k - c) / cols;
      const f = (g.get(k) ?? Infinity) + octile(c, r);
      if (f < bestF) { bestF = f; cur = k; }
    }

    if (cur === goalK) {
      const path: Cell[] = [];
      let k = cur;
      while (k !== startK) {
        const c = k % cols, r = (k - c) / cols;
        path.push({ col: c, row: r });
        k = cameFrom.get(k)!;
      }
      return path.reverse();
    }

    open.delete(cur);
    const cc = cur % cols, cr = (cur - cc) / cols;
    for (const [dc, dr, cost] of DIRS) {
      const nc = cc + dc, nr = cr + dr;
      if (!inBounds(nc, nr) || blocked(nc, nr)) continue;
      // Diagonals must keep clearance for the whole player box, not just avoid a
      // corner-cut — otherwise the box catches on the wall corner mid-step.
      if (dc !== 0 && dr !== 0 && !segmentClear(cc, cr, nc, nr)) continue;
      const nk = key(nc, nr);
      const tentative = (g.get(cur) ?? Infinity) + cost;
      if (tentative < (g.get(nk) ?? Infinity)) {
        cameFrom.set(nk, cur);
        g.set(nk, tentative);
        open.add(nk);
      }
    }
  }

  return null; // unreachable
}

/**
 * Like findPath, but when the goal tile is blocked/unreachable, aim for the
 * nearest open tile around it instead — preferring tiles closer to the start
 * (where the player walks from). Used for minimap taps that may land on a wall
 * or an object.
 */
export function findPathToward(start: Cell, goal: Cell): Cell[] | null {
  const direct = findPath(start, goal);
  if (direct) return direct;

  const rows = solidMap.length;
  const cols = solidMap[0]?.length ?? 0;
  const inBounds = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < rows;

  for (let ring = 1; ring <= 8; ring++) {
    const cells: Cell[] = [];
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue; // ring border only
        const c = goal.col + dc, r = goal.row + dr;
        if (inBounds(c, r) && !blocked(c, r)) cells.push({ col: c, row: r });
      }
    }
    cells.sort((a, b) =>
      ((a.col - start.col) ** 2 + (a.row - start.row) ** 2) -
      ((b.col - start.col) ** 2 + (b.row - start.row) ** 2));
    for (const cell of cells) {
      const p = findPath(start, cell);
      if (p && p.length) return p;
    }
  }
  return null;
}

/** True if the player's box (feet on the path, body rising above) can travel the
 *  straight segment between two tile centers without any part of that box hitting a
 *  blocked tile. Sampled along the segment and up the box, so both A* diagonals and
 *  smoothed lines keep clearance and don't catch on corners. */
function segmentClear(c0: number, r0: number, c1: number, r1: number): boolean {
  const ax = c0 + 0.5, ay = r0 + 0.5, bx = c1 + 0.5, by = r1 + 0.5;
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(dist / 0.2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
    for (const dx of [-HALF, HALF]) {
      for (const dy of [-HALF, HALF]) {
        if (blocked(Math.floor(px + dx), Math.floor(py + dy))) return false;
      }
    }
  }
  return true;
}

export function lineClear(a: Cell, b: Cell): boolean {
  return segmentClear(a.col, a.row, b.col, b.row);
}

/**
 * String-pull the grid path into free-angle segments: from each anchor, jump to
 * the farthest later waypoint with a clear line of sight. Turns the cell-by-cell
 * (8-direction) route into straight diagonals at any angle — closer to walking
 * with a joystick than snapping along the grid.
 */
export function smoothPath(start: Cell, path: Cell[]): Cell[] {
  if (path.length <= 1) return path;
  const out: Cell[] = [];
  let anchor = start;
  let i = 0;
  while (i < path.length) {
    let far = i;
    for (let j = path.length - 1; j > i; j--) {
      if (lineClear(anchor, path[j])) { far = j; break; }
    }
    out.push(path[far]);
    anchor = path[far];
    i = far + 1;
  }
  return out;
}
