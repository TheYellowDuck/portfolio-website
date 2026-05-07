import InputManager from "./input";
import { Camera } from "./camera";
import {
  TILE_SIZE,
  TILES,
  TILE_COLORS,
  museumMap,
//   MAP_WIDTH,
//   MAP_HEIGHT,
} from "./tilemap";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: InputManager;
  private camera: Camera;
  private animationFrameId: number = 0;
  private lastTime: number = 0;

  private player = {
    x: TILE_SIZE * 19,
    y: TILE_SIZE * 14,
    width: 24,
    height: 24,
    speed: 180,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = new InputManager();
    // this.camera = new Camera(canvas.width, canvas.height, MAP_WIDTH, MAP_HEIGHT);
    this.camera = new Camera(canvas.width, canvas.height);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    // this.camera = new Camera(width, height, MAP_WIDTH, MAP_HEIGHT);
    this.camera = new Camera(width, height);
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = (currentTime: number) => {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // Check if a tile at (col, row) is solid
  private isSolid(col: number, row: number): boolean {
    if (row < 0 || row >= museumMap.length || col < 0 || col >= museumMap[0].length) {
      return true; // Out of bounds = solid
    }
    return museumMap[row][col] === TILES.WALL;
  }

  private update(dt: number) {
    const { player } = this;
    const moveAmount = player.speed * dt;

    // Determine movement direction
    let dx = 0;
    let dy = 0;

    if (this.input.isDown("ArrowUp") || this.input.isDown("w")) dy -= moveAmount;
    if (this.input.isDown("ArrowDown") || this.input.isDown("s")) dy += moveAmount;
    if (this.input.isDown("ArrowLeft") || this.input.isDown("a")) dx -= moveAmount;
    if (this.input.isDown("ArrowRight") || this.input.isDown("d")) dx += moveAmount;

    // Move on X axis first, then resolve collisions
    if (dx !== 0) {
      player.x += dx;
      this.resolveCollisionX(dx);
    }

    // Move on Y axis, then resolve collisions
    if (dy !== 0) {
      player.y += dy;
      this.resolveCollisionY(dy);
    }

    // Update camera
    this.camera.follow(
      player.x + player.width / 2,
      player.y + player.height / 2
    );
  }

  private resolveCollisionX(direction: number) {
    const { player } = this;

    // Which rows does the player span?
    const topRow = Math.floor(player.y / TILE_SIZE);
    const bottomRow = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);

    if (direction < 0) {
      // Moving left — check player's left edge
      const col = Math.floor(player.x / TILE_SIZE);
      for (let row = topRow; row <= bottomRow; row++) {
        if (this.isSolid(col, row)) {
          // Snap player's left edge to the right side of the wall tile
          player.x = (col + 1) * TILE_SIZE;
          break;
        }
      }
    } else {
      // Moving right — check player's right edge
      const col = Math.floor((player.x + player.width - 0.01) / TILE_SIZE);
      for (let row = topRow; row <= bottomRow; row++) {
        if (this.isSolid(col, row)) {
          // Snap player's right edge to the left side of the wall tile
          player.x = col * TILE_SIZE - player.width;
          break;
        }
      }
    }
  }

  private resolveCollisionY(direction: number) {
    const { player } = this;

    // Which columns does the player span?
    const leftCol = Math.floor(player.x / TILE_SIZE);
    const rightCol = Math.floor((player.x + player.width - 0.01) / TILE_SIZE);

    if (direction < 0) {
      // Moving up — check player's top edge
      const row = Math.floor(player.y / TILE_SIZE);
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isSolid(col, row)) {
          // Snap player's top edge to the bottom of the wall tile
          player.y = (row + 1) * TILE_SIZE;
          break;
        }
      }
    } else {
      // Moving down — check player's bottom edge
      const row = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isSolid(col, row)) {
          // Snap player's bottom edge to the top of the wall tile
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

    // Fill entire screen with black (void outside the map)
    ctx.fillStyle = "#0a0a0a"; // background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tilemap
    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endCol = Math.min(museumMap[0].length - 1, Math.ceil((camX + canvas.width) / TILE_SIZE));
    const endRow = Math.min(museumMap.length - 1, Math.ceil((camY + canvas.height) / TILE_SIZE));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = museumMap[row][col];
        const screenX = col * TILE_SIZE - camX;
        const screenY = row * TILE_SIZE - camY;

        ctx.fillStyle = TILE_COLORS[tile] || "#000";
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw player
    ctx.fillStyle = "#e94560";
    ctx.fillRect(
      Math.round(player.x - camX),
      Math.round(player.y - camY),
      player.width,
      player.height
    );
  }
}