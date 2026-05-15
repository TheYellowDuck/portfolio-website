import { museumMap, TILE_SIZE, INTERACTABLE_TILES } from "./tilemap";
import { Exhibit, roomRegistry } from "@/data/projects";

export interface Interactable {
  col: number;
  row: number;
  tileType: number;
  radius: number;
  content: Exhibit;
}

function buildInteractables(): Interactable[] {
  const result: Interactable[] = [];
  const counters: Record<number, number> = {};

  for (let row = 0; row < museumMap.length; row++) {
    for (let col = 0; col < museumMap[0].length; col++) {
      const tile = museumMap[row][col];
      if (!INTERACTABLE_TILES.has(tile)) continue;

      if (counters[tile] === undefined) counters[tile] = 0;

      const exhibits = roomRegistry[tile];
      if (!exhibits) continue;

      const index = counters[tile];
      if (index >= exhibits.length) continue;

      result.push({
        col,
        row,
        tileType: tile,
        radius: 2,
        content: exhibits[index],
      });

      counters[tile]++;
    }
  }

  return result;
}

export const interactables = buildInteractables();

export function getNearbyInteractable(
  playerX: number,
  playerY: number,
  playerW: number,
  playerH: number,
): Interactable | null {
  const playerCenterCol = (playerX + playerW / 2) / TILE_SIZE;
  const playerCenterRow = (playerY + playerH / 2) / TILE_SIZE;

  let closest: Interactable | null = null;
  let closestDist = Infinity;

  for (const item of interactables) {
    const dx = playerCenterCol - (item.col + 0.5);
    const dy = playerCenterRow - (item.row + 1.5);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= item.radius && distance < closestDist) {
      closest = item;
      closestDist = distance;
    }
  }

  return closest;
}