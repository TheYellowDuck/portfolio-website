// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import { describe, it, expect } from "vitest";
import { findPath, findPathToward, smoothPath, type Cell } from "./pathfinding";
import { solidMap, PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW } from "./tilemap";
import { isSolid } from "./collision";

const ROWS = solidMap.length;
const COLS = solidMap[0].length;
const spawn: Cell = { col: PLAYER_SPAWN_COL, row: PLAYER_SPAWN_ROW };

// First non-trivial walkable tile reachable from spawn (rings outward, break early).
function reachableGoal(): Cell {
  for (let radius = 3; radius < Math.max(ROWS, COLS); radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        const c = spawn.col + dc, r = spawn.row + dr;
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS || isSolid(c, r)) continue;
        const p = findPath(spawn, { col: c, row: r });
        if (p && p.length >= 3) return { col: c, row: r };
      }
    }
  }
  throw new Error("no reachable goal found near spawn");
}

const firstSolid: Cell = (() => {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isSolid(c, r)) return { col: c, row: r };
  throw new Error("map has no solid tiles");
})();

const goal = reachableGoal();

describe("findPath", () => {
  it("returns [] when already at the goal", () => {
    expect(findPath(spawn, spawn)).toEqual([]);
  });

  it("returns null for out-of-bounds goals", () => {
    expect(findPath(spawn, { col: -1, row: -1 })).toBeNull();
    expect(findPath(spawn, { col: COLS + 4, row: ROWS + 4 })).toBeNull();
  });

  it("returns null for a solid goal", () => {
    expect(findPath(spawn, firstSolid)).toBeNull();
  });

  it("returns a contiguous walkable path ending at the goal", () => {
    const path = findPath(spawn, goal);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual(goal);
    let prev = spawn;
    for (const cell of path!) {
      expect(isSolid(cell.col, cell.row)).toBe(false); // never steps onto a wall
      const dc = Math.abs(cell.col - prev.col), dr = Math.abs(cell.row - prev.row);
      expect(Math.max(dc, dr)).toBe(1); // each step is one (8-directional) tile
      prev = cell;
    }
  });
});

describe("smoothPath", () => {
  it("never grows the path and keeps the destination", () => {
    const path = findPath(spawn, goal)!;
    const smoothed = smoothPath(spawn, path);
    expect(smoothed.length).toBeLessThanOrEqual(path.length);
    expect(smoothed[smoothed.length - 1]).toEqual(path[path.length - 1]);
  });

  it("returns short paths unchanged", () => {
    expect(smoothPath(spawn, [])).toEqual([]);
    expect(smoothPath(spawn, [goal])).toEqual([goal]);
  });
});

describe("findPathToward", () => {
  it("matches findPath for a reachable open goal", () => {
    expect(findPathToward(spawn, goal)).toEqual(findPath(spawn, goal));
  });

  it("routes to a nearby open tile when the goal is solid", () => {
    const path = findPathToward(spawn, firstSolid);
    if (path) {
      const end = path[path.length - 1];
      expect(isSolid(end.col, end.row)).toBe(false); // stops on something walkable
    }
  });
});
