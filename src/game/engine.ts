import InputManager from "./input";
import { Camera } from "./camera";
import {
  TILE_SIZE,
  TILES,
  TILE_COLORS,
  OBJECT_COLORS,
  museumMap,
  objectMap,
  solidMap,
  setTileAt,
  setSolidAt,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
} from "./tilemap";
import { COLORS } from "@/styles/theme";
import { getNearbyInteractable, Interactable } from "./interactables";
import { Exhibit } from "@/data/projects";

export type GameEvent =
  | { type: "nearby"; content: Exhibit }
  | { type: "interact"; content: Exhibit }
  | { type: "leave" };

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: InputManager;
  private camera: Camera;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private paused: boolean = false;
  private interactCooldown: boolean = false;

  public onEvent: ((event: GameEvent) => void) | null = null;
  private currentNearby: Interactable | null = null;

  private player = {
    x: TILE_SIZE * PLAYER_SPAWN_COL,
    y: TILE_SIZE * PLAYER_SPAWN_ROW,
    width: 56,
    height: 56,
    speed: 360,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = new InputManager();
    this.camera = new Camera(canvas.width, canvas.height);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera = new Camera(width, height);
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) {
      this.interactCooldown = true;
      setTimeout(() => { this.interactCooldown = false; }, 300);
    }
  }

  changeTiles(changes: { col: number; row: number; newTile: number }[]) {
    for (const change of changes) {
      setTileAt(change.col, change.row, change.newTile);
      // Keep solidMap in sync for tile-based solidity (WALL/VOID).
      // Note: pedestal-based solidity (row+1 blocked) is set at build time
      // and is unaffected here since changeTiles does not touch objectMap.
      setSolidAt(change.col, change.row, change.newTile === TILES.WALL || change.newTile === TILES.VOID);
    }
  }

  start() {
    this.camera.snapTo(
      this.player.x + this.player.width  / 2,
      this.player.y + this.player.height / 2,
    );
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = (currentTime: number) => {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (!this.paused) {
      this.update(deltaTime);
    }
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private isSolid(col: number, row: number): boolean {
    if (row < 0 || row >= museumMap.length || col < 0 || col >= museumMap[0].length) {
      return true;
    }
    return solidMap[row][col];
  }

  private update(dt: number) {
    const { player } = this;
    const moveAmount = player.speed * dt;

    let dx = 0;
    let dy = 0;

    if (this.input.isDown("ArrowUp") || this.input.isDown("w")) dy -= moveAmount;
    if (this.input.isDown("ArrowDown") || this.input.isDown("s")) dy += moveAmount;
    if (this.input.isDown("ArrowLeft") || this.input.isDown("a")) dx -= moveAmount;
    if (this.input.isDown("ArrowRight") || this.input.isDown("d")) dx += moveAmount;

    if (dx !== 0) {
      player.x += dx;
      this.resolveCollisionX(dx);
    }
    if (dy !== 0) {
      player.y += dy;
      this.resolveCollisionY(dy);
    }

    this.camera.follow(
      player.x + player.width / 2,
      player.y + player.height / 2,
      dt
    );

    const nearby = getNearbyInteractable(
      player.x, player.y, player.width, player.height
    );

    if (nearby) {
      if (this.currentNearby !== nearby) {
        this.currentNearby = nearby;
        this.onEvent?.({ type: "nearby", content: nearby.content });
      }

      const ePressed = this.input.isDown("e") || this.input.isDown("E") || this.input.isDown("Enter");
      if (ePressed && !this.interactCooldown) {
        this.onEvent?.({ type: "interact", content: nearby.content });
        this.interactCooldown = true;
        setTimeout(() => { this.interactCooldown = false; }, 500);
      }
    } else if (this.currentNearby !== null) {
      this.currentNearby = null;
      this.onEvent?.({ type: "leave" });
    }
  }

  private resolveCollisionX(direction: number) {
    const { player } = this;
    const topRow = Math.floor(player.y / TILE_SIZE);
    const bottomRow = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);

    if (direction < 0) {
      const col = Math.floor(player.x / TILE_SIZE);
      for (let row = topRow; row <= bottomRow; row++) {
        if (this.isSolid(col, row)) {
          player.x = (col + 1) * TILE_SIZE;
          break;
        }
      }
    } else {
      const col = Math.floor((player.x + player.width - 0.01) / TILE_SIZE);
      for (let row = topRow; row <= bottomRow; row++) {
        if (this.isSolid(col, row)) {
          player.x = col * TILE_SIZE - player.width;
          break;
        }
      }
    }
  }

  private resolveCollisionY(direction: number) {
    const { player } = this;
    const leftCol = Math.floor(player.x / TILE_SIZE);
    const rightCol = Math.floor((player.x + player.width - 0.01) / TILE_SIZE);

    if (direction < 0) {
      const row = Math.floor(player.y / TILE_SIZE);
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isSolid(col, row)) {
          player.y = (row + 1) * TILE_SIZE;
          break;
        }
      }
    } else {
      const row = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isSolid(col, row)) {
          player.y = row * TILE_SIZE - player.height;
          break;
        }
      }
    }
  }

  private render() {
    const { ctx, canvas, camera, player } = this;
    const camX = Math.round(camera.x);
    const camY = Math.round(camera.y);

    // Background — shows through VOID tiles
    ctx.fillStyle = COLORS.CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endCol   = Math.min(museumMap[0].length - 1, Math.ceil((camX + canvas.width)  / TILE_SIZE));
    const endRow   = Math.min(museumMap.length - 1,    Math.ceil((camY + canvas.height) / TILE_SIZE));

    // Pass 1: floor and wall tiles
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = museumMap[row][col];
        if (tile === TILES.VOID) continue;

        const screenX = col * TILE_SIZE - camX;
        const screenY = row * TILE_SIZE - camY;

        ctx.fillStyle = TILE_COLORS[tile] ?? TILE_COLORS[TILES.FLOOR];
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = COLORS.TILE_GRID;
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }

    // Pass 2: y-sorted player + objects
    // Player sort key: its bottom-edge row.
    // Object sort key: objectRow + 1 (the pedestal's visual front face, one row south).
    // Drawing north-to-south means anything with a higher sort row renders in front.
    const playerSortRow = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);

    for (let sortRow = startRow; sortRow <= endRow + 1; sortRow++) {
      // Player
      if (sortRow === playerSortRow) {
        ctx.fillStyle = COLORS.SAGE;
        ctx.fillRect(
          Math.round(player.x - camX),
          Math.round(player.y - camY),
          player.width,
          player.height
        );
      }

      // Objects (and their glow) at objectMap[sortRow - 1] have sort key sortRow
      const objectRow = sortRow - 1;
      if (objectRow >= startRow && objectRow <= endRow) {
        for (let col = startCol; col <= endCol; col++) {
          const screenX = col * TILE_SIZE - camX;
          const screenY = objectRow * TILE_SIZE - camY;

          // Soft glow — checked before the object null-guard so it fires even
          // for interactables that have no object (e.g. the easter egg).
          if (this.currentNearby?.row === objectRow && this.currentNearby?.col === col) {
            ctx.save();
            ctx.shadowColor = COLORS.SAGE;
            ctx.shadowBlur = 40;
            ctx.fillStyle = COLORS.SAGE_GLOW_FILL;
            ctx.fillRect(screenX - 6, screenY - 6, TILE_SIZE + 12, TILE_SIZE + 12);
            ctx.shadowBlur = 20;
            ctx.strokeStyle = COLORS.SAGE_GLOW_STROKE;
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.restore();
          }

          const obj = objectMap[objectRow][col];
          if (obj === null) continue;
          const pad = Math.round(TILE_SIZE / 5);
          ctx.fillStyle = OBJECT_COLORS[obj] ?? "#888888";
          ctx.fillRect(screenX + pad, screenY + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2);
        }
      }
    }
  }
}
