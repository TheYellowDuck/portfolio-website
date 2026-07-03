// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

// Scene rendering, extracted from engine.ts.
//
// `drawScene` is a pure function of (sprites, particles, camera window, player,
// ambient state). The engine calls it for the live viewport; /map-snapshot
// calls it (via engine.renderFull) for the whole map. Three passes:
//   Pass 0 — VOID background fill
//   Pass 1 — flat floor sprites + wall base colors
//   Pass 2 — y-sorted: wall-tops/knubs → horizontal walls → "me" → footsteps →
//            player → objects → sparkles
// followed by the character glow and ambient dust.

import {
  TILE_SIZE,
  TILES,
  TILE_COLORS,
  OBJECT_COLORS,
  museumMap,
  objectMap,
  solidMap,
  NPC_COL,
  NPC_ROW,
} from "./tilemap";
import { COLORS } from "@/styles/theme";
import type { SpriteRegistry } from "./sprites";
import type { ParticleSystem } from "./particles";
import type { Direction } from "./player";

/** Minimal player view the renderer needs (live Player or a snapshot dummy). */
export interface RenderPlayer {
  x: number;
  y: number;
  width: number;
  height: number;
  facing: Direction;
  isMoving: boolean;
  animFrame: number;
}

export interface AmbientState {
  lightsOff: boolean;
  meBlinking: boolean;
  /** Time-of-day ambient wash (an rgba string) painted over the whole scene. */
  tint?: string;
}

// 'left', 'middle', 'right', or null for non-horizontal wall tiles.
// Left/right edges: one horizontal neighbor is non-wall; middle: both are wall.
function horizWallType(row: number, col: number): 'left' | 'middle' | 'right' | null {
  if (museumMap[row]?.[col] !== TILES.WALL) return null;
  const above = row > 0 ? museumMap[row - 1][col] : TILES.VOID;
  const below = row + 1 < museumMap.length ? museumMap[row + 1][col] : TILES.VOID;
  if (above === TILES.WALL && below === TILES.WALL) return null;
  const left  = museumMap[row]?.[col - 1] ?? TILES.VOID;
  const right = museumMap[row]?.[col + 1] ?? TILES.VOID;
  const leftIsWall  = left  === TILES.WALL;
  const rightIsWall = right === TILES.WALL;
  if (leftIsWall && rightIsWall) return 'middle';
  if (!leftIsWall && rightIsWall) return 'left';
  if (leftIsWall && !rightIsWall) return 'right';
  return null;
}

// Rotation for a 3-neighbor intersection, or null if not one.
// Sprite faces left+top+right (missing S = 0°); rotate to match the missing side.
function intersectAngle(row: number, col: number): number | null {
  if (museumMap[row]?.[col] !== TILES.WALL) return null;
  const hasN = museumMap[row - 1]?.[col] === TILES.WALL;
  const hasS = museumMap[row + 1]?.[col] === TILES.WALL;
  const hasE = museumMap[row]?.[col + 1] === TILES.WALL;
  const hasW = museumMap[row]?.[col - 1] === TILES.WALL;
  if ((hasN ? 1 : 0) + (hasS ? 1 : 0) + (hasE ? 1 : 0) + (hasW ? 1 : 0) !== 3) return null;
  if (!hasS) return 0;
  if (!hasW) return Math.PI / 2;
  if (!hasN) return Math.PI;
  return -Math.PI / 2;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  sprites: SpriteRegistry,
  particles: ParticleSystem,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  player: RenderPlayer,
  glowAlpha: number,
  ambient: AmbientState,
  debugPhysics: boolean,
  hidePlayer = false,
  playerAlpha = 1,
  // Hook to draw loose, y-sorted entities (the easter-egg duck) interleaved with
  // the scene. Called once per sort row so the player can pass in front of/behind them.
  drawEntities?: (sortRow: number, camX: number, camY: number) => void,
  renderParticles = true,
): void {
  ctx.imageSmoothingEnabled = false;

  // Background — shows through VOID tiles
  ctx.fillStyle = COLORS.CANVAS_BG;
  ctx.fillRect(0, 0, viewW, viewH);

  // Extra rows above so tall wall sprites (up to 3 tiles high) don't pop in.
  const startCol = Math.max(0, Math.floor(camX / TILE_SIZE) - 2);
  const startRow = Math.max(0, Math.floor(camY / TILE_SIZE) - 5);
  const endCol   = Math.min(museumMap[0].length - 1, Math.ceil((camX + viewW) / TILE_SIZE) + 2);
  const endRow   = Math.min(museumMap.length - 1,    Math.ceil((camY + viewH) / TILE_SIZE) + 2);

  // Pass 0: void tiles — drawn beneath everything so wall/floor edges blend naturally.
  ctx.fillStyle = COLORS.CANVAS_BG;
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = museumMap[row]?.[col];
      if (tile !== TILES.VOID && tile !== undefined) continue;
      ctx.fillRect(col * TILE_SIZE - camX, row * TILE_SIZE - camY, TILE_SIZE, TILE_SIZE);
    }
  }

  // Pass 1: flat base layer — floor sprites and wall solid colors.
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tile = museumMap[row]?.[col];
      if (tile === undefined || tile === TILES.VOID) continue;
      const screenX = col * TILE_SIZE - camX;
      const screenY = row * TILE_SIZE - camY;
      if (sprites.floorSpritesLoaded === 2 && (TILE_COLORS[tile] ?? TILE_COLORS[TILES.FLOOR]) === COLORS.FLOOR) {
        ctx.drawImage(sprites.floorSprites[(row * 7 + col * 13) & 1], screenX, screenY, TILE_SIZE, TILE_SIZE);
      }

      if (tile === TILES.WALL && sprites.floorSpritesLoaded === 2) {
        const isFloorTile = (t: number | undefined) =>
          t !== undefined && t !== TILES.VOID && (TILE_COLORS[t] ?? TILE_COLORS[TILES.FLOOR]) === COLORS.FLOOR;
        if (isFloorTile(museumMap[row]?.[col - 1])) {
          const img = sprites.floorSprites[(row * 7 + (col - 1) * 13) & 1];
          ctx.drawImage(img, img.naturalWidth / 2, 0, img.naturalWidth / 2, img.naturalHeight,
            screenX, screenY, TILE_SIZE / 2, TILE_SIZE);
        }
        if (isFloorTile(museumMap[row]?.[col + 1])) {
          const img = sprites.floorSprites[(row * 7 + (col + 1) * 13) & 1];
          ctx.drawImage(img, 0, 0, img.naturalWidth / 2, img.naturalHeight,
            screenX + TILE_SIZE / 2, screenY, TILE_SIZE / 2, TILE_SIZE);
        }
      }
    }
  }

  // Pass 2: y-sorted sprites — within each sort row: wall-tops → knubs → walls → player → objects.
  const playerSortRow = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);
  const nsewDirs: Array<['N' | 'S' | 'E' | 'W', number, number]> = [['N', -1, 0], ['S', 1, 0], ['E', 0, 1], ['W', 0, -1]];

  for (let sortRow = startRow; sortRow <= endRow + 1; sortRow++) {
    const row = sortRow - 1;
    const inRange = row >= 0 && row < museumMap.length;

    // Vertical wall-top sprites (null horizWallType walls)
    if (inRange && (sprites.wallTopSpritesLoaded === 7 || sprites.wallTopIntersectReady)) {
      for (let col = startCol; col <= endCol; col++) {
        if (museumMap[row][col] !== TILES.WALL || horizWallType(row, col) !== null) continue;
        const screenX = col * TILE_SIZE - camX;
        const screenY = row * TILE_SIZE - camY;
        const hasN = museumMap[row - 1]?.[col] === TILES.WALL;
        const hasS = museumMap[row + 1]?.[col] === TILES.WALL;
        const hasE = museumMap[row]?.[col + 1] === TILES.WALL;
        const hasW = museumMap[row]?.[col - 1] === TILES.WALL;
        const neighborCount = (hasN ? 1 : 0) + (hasS ? 1 : 0) + (hasE ? 1 : 0) + (hasW ? 1 : 0);
        const iAngle = intersectAngle(row, col);
        let angle: number;
        let sprite: HTMLImageElement | null;
        if (neighborCount === 4 && sprites.wallTopCrossReady) {
          angle  = ((row * 13 + col * 7) % 4) * (Math.PI / 2);
          sprite = sprites.wallTopCrossSprite;
        } else if (iAngle !== null && sprites.wallTopIntersectReady) {
          angle  = iAngle;
          sprite = sprites.wallTopIntersectSprite;
        } else if (neighborCount < 3 && sprites.wallTopSpritesLoaded === 7) {
          angle  = Math.PI / 2;
          sprite = sprites.wallTopSprites[(row * 11 + col * 17) % 7];
        } else {
          continue;
        }
        if (!sprite) continue;
        ctx.save();
        ctx.translate(screenX + TILE_SIZE / 2, screenY - 1.5 * TILE_SIZE);
        ctx.rotate(angle);
        ctx.drawImage(sprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        ctx.restore();
      }
    }

    // Wall-top knubs (walls with exactly one NSEW wall neighbor)
    if (inRange && sprites.wallTopKnubReady) {
      for (let col = startCol; col <= endCol; col++) {
        if (museumMap[row][col] !== TILES.WALL) continue;
        const wallNeighbors = nsewDirs.filter(([, dr, dc]) => museumMap[row + dr]?.[col + dc] === TILES.WALL);
        if (wallNeighbors.length !== 1) continue;
        const [dir] = wallNeighbors[0];
        const angle = dir === 'W' ? 0 : dir === 'E' ? Math.PI : dir === 'N' ? -Math.PI / 2 : Math.PI / 2;
        const screenX = col * TILE_SIZE - camX;
        const screenY = row * TILE_SIZE - camY;
        ctx.save();
        ctx.translate(screenX + TILE_SIZE / 2, screenY - 1.5 * TILE_SIZE);
        ctx.rotate(angle);
        ctx.drawImage(sprites.wallTopKnubSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        ctx.restore();
      }
    }

    // Horizontal wall sprites (left / middle / right)
    if (inRange) {
      for (let col = startCol; col <= endCol; col++) {
        const type = horizWallType(row, col);
        if (!type) continue;
        const screenX = col * TILE_SIZE - camX;
        const screenY = row * TILE_SIZE - camY;
        let img: HTMLImageElement | null = null;
        if (type === 'left'   && sprites.wallHLeftReady)           img = sprites.wallHLeftSprite;
        if (type === 'right'  && sprites.wallHRightReady)          img = sprites.wallHRightSprite;
        if (type === 'middle' && sprites.wallHSpritesLoaded === 5) img = sprites.wallHSprites[(row * 7 + col * 13) % 5];
        if (!img) continue;
        ctx.drawImage(img, screenX, screenY - 1 * TILE_SIZE, TILE_SIZE, 2 * TILE_SIZE);
        if (type === 'middle') {
          const iAngle = intersectAngle(row, col);
          if (iAngle !== null && sprites.wallTopIntersectReady) {
            ctx.save();
            ctx.translate(screenX + TILE_SIZE / 2, screenY - 1.5 * TILE_SIZE);
            ctx.rotate(iAngle);
            ctx.drawImage(sprites.wallTopIntersectSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
            ctx.restore();
          } else if (iAngle === null && sprites.wallTopSpritesLoaded === 7) {
            ctx.drawImage(sprites.wallTopSprites[(row * 11 + col * 17) % 7], screenX, screenY - 2 * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
        if ((type === 'left' || type === 'right') && sprites.wallTopCornerReady) {
          const hasN = museumMap[row - 1]?.[col] === TILES.WALL;
          const hasS = museumMap[row + 1]?.[col] === TILES.WALL;
          if (hasN || hasS) {
            const hasW = type === 'right';
            const angle = hasN && hasW ? 0 : hasN ? Math.PI / 2 : hasW ? -Math.PI / 2 : Math.PI;
            ctx.save();
            ctx.translate(screenX + TILE_SIZE / 2, screenY - 1.5 * TILE_SIZE);
            ctx.rotate(angle);
            ctx.drawImage(sprites.wallTopCornerSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
            ctx.restore();
          }
        }
      }
    }

    // "Me" desk sprite — static scene at the right end of the hallway
    if (sortRow === NPC_ROW && sprites.meSpriteReady) {
      const drawH = TILE_SIZE * 2.5;
      let activeMe: HTMLImageElement;
      if (ambient.lightsOff && sprites.meLightOffReady) {
        activeMe = sprites.meLightOffSprite;
      } else {
        activeMe = (ambient.meBlinking && sprites.meBlinkReady) ? sprites.meBlinkSprite : sprites.meSprite;
      }
      const drawW = TILE_SIZE * 3;
      const centerX = Math.round(NPC_COL * TILE_SIZE - camX + TILE_SIZE / 2);
      const sy = Math.round(NPC_ROW * TILE_SIZE - camY) - TILE_SIZE * 1.25;
      ctx.drawImage(activeMe, centerX - drawW / 2, sy, drawW, drawH);
    }

    // Footstep particles — drawn at their captured sort row, beneath the player sprite
    if (renderParticles) {
      particles.draw(ctx, camX, camY, viewW, viewH, 'footstep', sortRow);
    }

    // Player — drawn at playerAlpha so the portal transition can fade it in/out.
    if (!hidePlayer && playerAlpha > 0 && sortRow === playerSortRow) {
      const drawH = TILE_SIZE * 4;
      const centerX = Math.round(player.x - camX + player.width / 2);
      const sy = Math.round(player.y - camY) - TILE_SIZE * 2.65;
      const drawImg = (img: HTMLImageElement) => {
        if (!img.complete || img.naturalWidth === 0) return;
        const drawW = drawH * (img.naturalWidth / img.naturalHeight);
        ctx.drawImage(img, centerX - drawW / 2, sy, drawW, drawH);
      };
      ctx.save();
      ctx.globalAlpha = playerAlpha;
      let frame: HTMLImageElement | null =
        !player.isMoving && player.facing === 'north'
          ? sprites.northIdleSprite
          : sprites.frames(player.isMoving ? 'walk' : 'idle', player.facing)[player.animFrame] ?? null;
      // If the chosen frame hasn't decoded yet (lazy per-direction load), reuse the
      // last good one so the character holds a pose instead of blinking out.
      if (frame && frame.complete && frame.naturalWidth > 0) sprites.lastPlayerFrame = frame;
      else frame = sprites.lastPlayerFrame;
      if (frame) drawImg(frame);
      ctx.restore();
    }

    // Loose y-sorted entities (easter-egg duck) — interleaved at their sort row.
    drawEntities?.(sortRow, camX, camY);

    // Objects and glow
    if (inRange) {
      for (let col = startCol; col <= endCol; col++) {
        const screenX = col * TILE_SIZE - camX;
        const screenY = row * TILE_SIZE - camY;

        const obj = objectMap[row][col];
        if (obj === null) continue;
        if (obj === 1 && sprites.pedestalReady) {
          ctx.drawImage(sprites.pedestalSprite, screenX, screenY, TILE_SIZE, TILE_SIZE * 2);
        } else {
          const pad = Math.round(TILE_SIZE / 5);
          ctx.fillStyle = OBJECT_COLORS[obj] ?? "#888888";
          ctx.fillRect(screenX + pad, screenY + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2);
        }
      }

      // Sparkles — drawn after the pedestal sprite at their stored sort row,
      // independent of currentNearby so they fade out naturally after leaving range
      if (renderParticles) {
        particles.draw(ctx, camX, camY, viewW, viewH, 'sparkle', row);
      }
    }
  }

  // Character glow — fades in/out as player moves behind walls
  if (glowAlpha > 0) {
    const gCX = player.x - camX + player.width / 2;
    const gCY = player.y - camY - TILE_SIZE * 0.4;
    const gRX = TILE_SIZE * 0.5;
    const gRY = TILE_SIZE;
    const glowColor = "#FFA54F";
    const glowPasses = [
      { lineWidth: 18, shadowBlur: 70, alpha: 0.04 },
      { lineWidth:  9, shadowBlur: 40, alpha: 0.06 },
      { lineWidth:  4, shadowBlur: 22, alpha: 0.07 },
      { lineWidth:  1, shadowBlur: 18, alpha: 0.05 },
    ];
    for (const pass of glowPasses) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(gCX, gCY, gRX, gRY, 0, 0, Math.PI * 2);
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = pass.shadowBlur;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = pass.lineWidth;
      ctx.globalAlpha = pass.alpha * glowAlpha;
      ctx.stroke();
      ctx.restore();
    }
  }

  if (renderParticles) particles.draw(ctx, camX, camY, viewW, viewH, 'dust');

  // Time-of-day ambient wash over the whole scene (golden hour → dusk → night → dawn).
  if (ambient.tint) {
    ctx.fillStyle = ambient.tint;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  // Debug: solid-tile outlines + entity boxes drawn on top of everything (VOID excluded)
  if (debugPhysics) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (!solidMap[row]?.[col]) continue;
        if (museumMap[row]?.[col] === TILES.VOID) continue;
        ctx.strokeRect(col * TILE_SIZE - camX + 0.5, row * TILE_SIZE - camY + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }

    // Player physics rect
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.strokeRect(player.x - camX + 0.5, player.y - camY + 0.5, player.width - 1, player.height - 1);

    // Me sprite tile
    ctx.strokeRect(NPC_COL * TILE_SIZE - camX + 0.5, NPC_ROW * TILE_SIZE - camY + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

    ctx.restore();
  }
}
