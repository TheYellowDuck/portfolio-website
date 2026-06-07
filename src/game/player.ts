// Player state, movement, facing, and walk/idle animation — extracted from
// engine.ts. The engine owns the input manager and calls `move()` once per
// update tick; everything the renderer needs (position, facing, frame) lives on
// the Player instance.
//
// `Direction` and the animation constants are also the source of truth for the
// sprite registry (which frame folders to load) and the renderer (which frame
// to draw), so they're exported from here.

import type InputManager from "./input";
import { TILE_SIZE, PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW } from "./tilemap";
import { resolveCollisionX, resolveCollisionY } from "./collision";

export type Direction =
  | 'east' | 'west' | 'north' | 'south'
  | 'north-east' | 'north-west' | 'south-east' | 'south-west';

// Note: idle has no dedicated 'north' folder — north idle uses a static sprite.
export const IDLE_DIRS: Direction[] = ['east', 'north-east', 'north-west', 'south-east', 'south-west', 'south', 'west'];
export const WALK_DIRS: Direction[] = ['east', 'north-east', 'north', 'north-west', 'south-east', 'south-west', 'south', 'west'];
export const IDLE_FRAMES = 5;
export const WALK_FRAMES = 6;

const RUN_MULTIPLIER = 1.9;

export function dirFromInput(dx: number, dy: number): Direction {
  if (dx > 0 && dy < 0) return 'north-east';
  if (dx > 0 && dy > 0) return 'south-east';
  if (dx < 0 && dy < 0) return 'north-west';
  if (dx < 0 && dy > 0) return 'south-west';
  if (dx > 0) return 'east';
  if (dx < 0) return 'west';
  if (dy < 0) return 'north';
  return 'south';
}

/** Result of one movement tick, consumed by the engine for events/audio. */
export interface MoveResult {
  isMoving: boolean;
  wasMoving: boolean;
  running: boolean;
}

export class Player {
  x = TILE_SIZE * PLAYER_SPAWN_COL + TILE_SIZE / 4;
  y = TILE_SIZE * PLAYER_SPAWN_ROW + TILE_SIZE / 2;
  width = TILE_SIZE / 2;
  height = TILE_SIZE / 2;
  speed = 200;
  facing: Direction = 'east';
  isMoving = false;
  animFrame = 0;
  animTimer = 0;

  /** Center of the physics rect — used for camera follow / glow tests. */
  get centerX(): number { return this.x + this.width / 2; }
  get centerY(): number { return this.y + this.height / 2; }

  /**
   * Read input, move with per-axis collision, update facing + animation frame.
   * Returns movement flags so the engine can fire footstep/idle/active events.
   */
  move(input: InputManager, dt: number): MoveResult {
    const running = input.isDown("Shift");
    const moveAmount = this.speed * (running ? RUN_MULTIPLIER : 1) * dt;

    let dx = 0;
    let dy = 0;
    if (input.isDown("ArrowUp")    || input.isDown("w")) dy -= moveAmount;
    if (input.isDown("ArrowDown")  || input.isDown("s")) dy += moveAmount;
    if (input.isDown("ArrowLeft")  || input.isDown("a")) dx -= moveAmount;
    if (input.isDown("ArrowRight") || input.isDown("d")) dx += moveAmount;

    if (dx !== 0 && dy !== 0) {
      const norm = 1 / Math.SQRT2;
      dx *= norm;
      dy *= norm;
    }

    if (dx !== 0) {
      this.x += dx;
      resolveCollisionX(this, dx);
    }
    if (dy !== 0) {
      this.y += dy;
      resolveCollisionY(this, dy);
    }

    const wasMoving = this.isMoving;
    const isMoving = dx !== 0 || dy !== 0;
    if (isMoving) this.facing = dirFromInput(dx, dy);
    this.isMoving = isMoving;

    this.advanceAnimation(dt, isMoving, wasMoving, running);

    return { isMoving, wasMoving, running };
  }

  private advanceAnimation(dt: number, isMoving: boolean, wasMoving: boolean, running: boolean): void {
    if (wasMoving !== isMoving) {
      this.animFrame = 0;
      this.animTimer = 0;
    }
    const frameDuration = isMoving ? 0.085 / (running ? RUN_MULTIPLIER : 1) : 0.45;
    const frameCount = isMoving ? WALK_FRAMES : IDLE_FRAMES;
    this.animTimer += dt;
    if (this.animTimer >= frameDuration) {
      this.animTimer -= frameDuration;
      this.animFrame = (this.animFrame + 1) % frameCount;
    }
  }
}
