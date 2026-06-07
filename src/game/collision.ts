// Tile-based AABB collision resolution, extracted from engine.ts.
//
// Solidity is read from `solidMap` (decoupled from tile type so sprites can
// extend beyond their tile bounds — see CLAUDE.md). Each resolver mutates the
// passed rect, snapping it flush against the first solid tile it overlaps along
// one axis. Movement is resolved one axis at a time (X then Y) by the caller.

import { TILE_SIZE, museumMap, solidMap } from "./tilemap";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Out-of-bounds tiles count as solid so the player can't leave the map. */
export function isSolid(col: number, row: number): boolean {
  if (row < 0 || row >= museumMap.length || col < 0 || col >= museumMap[0].length) {
    return true;
  }
  return solidMap[row][col];
}

/** Resolve horizontal overlap after `rect.x` has already moved by `direction`. */
export function resolveCollisionX(rect: Rect, direction: number): void {
  const topRow = Math.floor(rect.y / TILE_SIZE);
  const bottomRow = Math.floor((rect.y + rect.height - 0.01) / TILE_SIZE);

  if (direction < 0) {
    const col = Math.floor(rect.x / TILE_SIZE);
    for (let row = topRow; row <= bottomRow; row++) {
      if (isSolid(col, row)) {
        rect.x = (col + 1) * TILE_SIZE;
        break;
      }
    }
  } else {
    const col = Math.floor((rect.x + rect.width - 0.01) / TILE_SIZE);
    for (let row = topRow; row <= bottomRow; row++) {
      if (isSolid(col, row)) {
        rect.x = col * TILE_SIZE - rect.width;
        break;
      }
    }
  }
}

/** Resolve vertical overlap after `rect.y` has already moved by `direction`. */
export function resolveCollisionY(rect: Rect, direction: number): void {
  const leftCol = Math.floor(rect.x / TILE_SIZE);
  const rightCol = Math.floor((rect.x + rect.width - 0.01) / TILE_SIZE);

  if (direction < 0) {
    const row = Math.floor(rect.y / TILE_SIZE);
    for (let col = leftCol; col <= rightCol; col++) {
      if (isSolid(col, row)) {
        rect.y = (row + 1) * TILE_SIZE;
        break;
      }
    }
  } else {
    const row = Math.floor((rect.y + rect.height - 0.01) / TILE_SIZE);
    for (let col = leftCol; col <= rightCol; col++) {
      if (isSolid(col, row)) {
        rect.y = row * TILE_SIZE - rect.height;
        break;
      }
    }
  }
}
