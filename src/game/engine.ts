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
  NPC_COL,
  NPC_ROW,
} from "./tilemap";
import { COLORS } from "@/styles/theme";
import { getNearbyInteractable, interactables, Interactable } from "./interactables";
import { Exhibit } from "@/data/projects";

type Direction = 'east' | 'west' | 'north' | 'south' | 'north-east' | 'north-west' | 'south-east' | 'south-west';

const IDLE_DIRS: Direction[] = ['east', 'north-east', 'north-west', 'south-east', 'south-west', 'south', 'west'];
const WALK_DIRS: Direction[] = ['east', 'north-east', 'north', 'north-west', 'south-east', 'south-west', 'south', 'west'];
const IDLE_FRAMES = 5;
const WALK_FRAMES = 6;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  r: number; g: number; b: number;
  type: 'dust' | 'footstep' | 'sparkle';
  phase: number;
  freq: number;
  amp: number;
  sortRow: number;  // y-sort row for depth ordering
  maxAlpha: number; // peak opacity
}

function dirFromInput(dx: number, dy: number): Direction {
  if (dx > 0 && dy < 0) return 'north-east';
  if (dx > 0 && dy > 0) return 'south-east';
  if (dx < 0 && dy < 0) return 'north-west';
  if (dx < 0 && dy > 0) return 'south-west';
  if (dx > 0) return 'east';
  if (dx < 0) return 'west';
  if (dy < 0) return 'north';
  return 'south';
}

export type GameEvent =
  | { type: "nearby"; content: Exhibit }
  | { type: "interact"; content: Exhibit }
  | { type: "leave" }
  | { type: "idle" }
  | { type: "active" };

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: InputManager;
  private camera: Camera;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private paused: boolean = false;
  private interactCooldown: boolean = false;
  private floorSprites: [HTMLImageElement, HTMLImageElement];
  private floorSpritesLoaded: number = 0;
  private wallHSprites: HTMLImageElement[] = [];
  private wallHSpritesLoaded: number = 0;
  private wallTopSprites: HTMLImageElement[] = [];
  private wallTopSpritesLoaded: number = 0;
  private wallHLeftSprite: HTMLImageElement;
  private wallHLeftReady: boolean = false;
  private wallHRightSprite: HTMLImageElement;
  private wallHRightReady: boolean = false;
  private wallTopKnubSprite: HTMLImageElement;
  private wallTopKnubReady: boolean = false;
  private wallTopCornerSprite: HTMLImageElement;
  private wallTopCornerReady: boolean = false;
  private wallTopIntersectSprite: HTMLImageElement;
  private wallTopIntersectReady: boolean = false;
  private wallTopCrossSprite: HTMLImageElement;
  private wallTopCrossReady: boolean = false;
  private pedestalSprite: HTMLImageElement;
  private pedestalReady: boolean = false;
  private meSprite: HTMLImageElement;
  private meSpriteReady: boolean = false;
  private meBlinkSprite: HTMLImageElement;
  private meBlinkReady: boolean = false;
  private meBlinkTimer: number = 3 + Math.random() * 2;
  private meBlinking: boolean = false;
  private meBlinkDuration: number = 0;
  private meLightOffSprite: HTMLImageElement;
  private meLightOffReady: boolean = false;
  private flickerTimer: number = 18 + Math.random() * 25;
  private flickerBurst: number[] = [];
  private flickerPhaseTimer: number = 0;
  private lightsOff: boolean = false;
  private flickerSustainTimer: number = 0;
  private idleSprites: Map<Direction, HTMLImageElement[]> = new Map();
  private walkSprites: Map<Direction, HTMLImageElement[]> = new Map();
  private northIdleSprite: HTMLImageElement = new Image();
  private glowAlpha: number = 0;
  private particles: Particle[] = [];
  private footstepTimer: number = 0;
  private sparkleTimer: number = 0;
  private dustSpawnTimer: number = 0;

  public onEvent: ((event: GameEvent) => void) | null = null;
  public onReady: (() => void) | null = null;
  public onPositionChange: ((x: number, y: number) => void) | null = null;
  public onFootstep: ((running: boolean) => void) | null = null;
  public debugPhysics: boolean = false;
  private _spritesLoaded: number = 0;
  private _spritesTotal: number = 0;
  private currentNearby: Interactable | null = null;
  private idleTimer: number = 0;
  private idleFired: boolean = false;

  private player = {
    x: TILE_SIZE * PLAYER_SPAWN_COL + TILE_SIZE / 4,
    y: TILE_SIZE * PLAYER_SPAWN_ROW + TILE_SIZE / 2,
    width: TILE_SIZE / 2,
    height: TILE_SIZE / 2,
    speed: 200,
    facing: 'east' as Direction,
    isMoving: false,
    animFrame: 0,
    animTimer: 0,
  };

  private _markLoaded() {
    if (++this._spritesLoaded >= this._spritesTotal) this.onReady?.();
  }

  constructor(canvas: HTMLCanvasElement, cacheBust?: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = new InputManager();
    this.camera = new Camera(canvas.width, canvas.height);
    const url = (path: string) => cacheBust ? `${path}?v=${cacheBust}` : path;
    // Registers a sprite for readiness tracking — increment total synchronously,
    // decrement (via _markLoaded) when the image actually loads.
    const tracked = (img: HTMLImageElement, onLoad?: () => void): HTMLImageElement => {
      this._spritesTotal++;
      img.onload = () => { onLoad?.(); this._markLoaded(); };
      return img;
    };
    this.floorSprites = [
      tracked(new Image(), () => { this.floorSpritesLoaded++; }),
      tracked(new Image(), () => { this.floorSpritesLoaded++; }),
    ];
    this.floorSprites[0].src = url("/assets/sprites/floor2.png");
    this.floorSprites[1].src = url("/assets/sprites/floor3.png");
    for (let i = 0; i < 5; i++) {
      const img = tracked(new Image(), () => { this.wallHSpritesLoaded++; });
      img.src = url(`/assets/sprites/wall-side/tile${String(i).padStart(2, "0")}.png`);
      this.wallHSprites.push(img);
    }
    for (let i = 0; i < 7; i++) {
      const img = tracked(new Image(), () => { this.wallTopSpritesLoaded++; });
      img.src = url(`/assets/sprites/wall-top/tile${String(i).padStart(2, "0")}.png`);
      this.wallTopSprites.push(img);
    }
    this.wallHLeftSprite = tracked(new Image(), () => { this.wallHLeftReady = true; });
    this.wallHLeftSprite.src = url("/assets/sprites/wall-side-left.png");
    this.wallHRightSprite = tracked(new Image(), () => { this.wallHRightReady = true; });
    this.wallHRightSprite.src = url("/assets/sprites/wall-side-right.png");
    this.wallTopCrossSprite = tracked(new Image(), () => { this.wallTopCrossReady = true; });
    this.wallTopCrossSprite.src = url("/assets/sprites/wall-top-cross.png");
    this.wallTopIntersectSprite = tracked(new Image(), () => { this.wallTopIntersectReady = true; });
    this.wallTopIntersectSprite.src = url("/assets/sprites/wall-top-intersect.png");
    this.wallTopCornerSprite = tracked(new Image(), () => { this.wallTopCornerReady = true; });
    this.wallTopCornerSprite.src = url("/assets/sprites/wall-top-corner.png");
    this.wallTopKnubSprite = tracked(new Image(), () => { this.wallTopKnubReady = true; });
    this.wallTopKnubSprite.src = url("/assets/sprites/wall-top-knub.png");
    this.pedestalSprite = tracked(new Image(), () => { this.pedestalReady = true; });
    this.pedestalSprite.src = url("/assets/sprites/pedestal-book.png");

    this.meSprite = tracked(new Image(), () => { this.meSpriteReady = true; });
    this.meSprite.src = url("/assets/sprites/me-2.png");
    this.meBlinkSprite = tracked(new Image(), () => { this.meBlinkReady = true; });
    this.meBlinkSprite.src = url("/assets/sprites/me-blink.png");
    this.meLightOffSprite = tracked(new Image(), () => { this.meLightOffReady = true; });
    this.meLightOffSprite.src = url("/assets/sprites/me-light-off.png");

    for (const dir of IDLE_DIRS) {
      const frames: HTMLImageElement[] = [];
      for (let i = 0; i < IDLE_FRAMES; i++) {
        const img = new Image();
        img.src = url(`/assets/sprites/character/states/standing/animations/idle/${dir}/frame_${String(i).padStart(3, "0")}.png`);
        frames.push(img);
      }
      this.idleSprites.set(dir, frames);
    }
    for (const dir of WALK_DIRS) {
      const frames: HTMLImageElement[] = [];
      for (let i = 0; i < WALK_FRAMES; i++) {
        const img = new Image();
        img.src = url(`/assets/sprites/character/states/standing/animations/walk/${dir}/frame_${String(i).padStart(3, "0")}.png`);
        frames.push(img);
      }
      this.walkSprites.set(dir, frames);
    }
    this.northIdleSprite.src = url("/assets/sprites/character/states/standing/rotations/north.png");
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
    this.camera.snapTo(
      this.player.x + this.player.width  / 2,
      this.player.y + this.player.height / 2,
    );
  }

  triggerInteract() {
    if (this.currentNearby && !this.interactCooldown) {
      this.onEvent?.({ type: "interact", content: this.currentNearby.content });
      this.interactCooldown = true;
      setTimeout(() => { this.interactCooldown = false; }, 500);
    }
  }

  clickAt(screenX: number, screenY: number) {
    if (this.paused || this.interactCooldown) return;
    const col = Math.floor((screenX + this.camera.x) / TILE_SIZE);
    const row = Math.floor((screenY + this.camera.y) / TILE_SIZE);
    const target = interactables.find(i => i.col === col && (i.row === row || i.row === row - 1));
    if (target) {
      this.onEvent?.({ type: "interact", content: target.content });
      this.interactCooldown = true;
      setTimeout(() => { this.interactCooldown = false; }, 500);
    }
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.input.clear();
    if (!paused) {
      this.currentNearby = null;
      this.interactCooldown = true;
      setTimeout(() => { this.interactCooldown = false; }, 500);
      this.idleTimer = 0;
      this.idleFired = false;
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
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
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
    this.updateParticles(dt);
    const { player } = this;
    const running = this.input.isDown("Shift");
    const runMultiplier = 1.9;
    const moveAmount = player.speed * (running ? runMultiplier : 1) * dt;

    let dx = 0;
    let dy = 0;

    if (this.input.isDown("ArrowUp") || this.input.isDown("w")) dy -= moveAmount;
    if (this.input.isDown("ArrowDown") || this.input.isDown("s")) dy += moveAmount;
    if (this.input.isDown("ArrowLeft") || this.input.isDown("a")) dx -= moveAmount;
    if (this.input.isDown("ArrowRight") || this.input.isDown("d")) dx += moveAmount;

    if (dx !== 0 && dy !== 0) {
      const norm = 1 / Math.SQRT2;
      dx *= norm;
      dy *= norm;
    }

    if (dx !== 0) {
      player.x += dx;
      this.resolveCollisionX(dx);
    }
    if (dy !== 0) {
      player.y += dy;
      this.resolveCollisionY(dy);
    }

    const wasMoving = player.isMoving;
    const isMoving = dx !== 0 || dy !== 0;
    if (isMoving) player.facing = dirFromInput(dx, dy);
    player.isMoving = isMoving;

    if (isMoving) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = running ? 0.15 : 0.22;
        this.spawnFootstepDust();
        this.onFootstep?.(running);
      }
    } else {
      this.footstepTimer = 0;
    }

    if (!isMoving) {
      this.idleTimer += dt;
      if (!this.idleFired && this.idleTimer >= 3) {
        this.idleFired = true;
        this.onEvent?.({ type: "idle" });
      }
    } else {
      this.idleTimer = 0;
      if (this.idleFired) {
        this.idleFired = false;
        this.onEvent?.({ type: "active" });
      }
    }
    // Me-sprite blink
    const flickering = this.flickerBurst.length > 0 || this.flickerSustainTimer > 0;

    // Me-sprite blink — paused while flickering
    if (!flickering) {
      if (this.meBlinking) {
        this.meBlinkDuration -= dt;
        if (this.meBlinkDuration <= 0) {
          this.meBlinking = false;
          this.meBlinkTimer = 3 + Math.random() * 4;
        }
      } else {
        this.meBlinkTimer -= dt;
        if (this.meBlinkTimer <= 0) {
          this.meBlinking = true;
          this.meBlinkDuration = 0.12;
        }
      }
    }

    // Light flicker burst — only starts when not blinking
    if (this.flickerSustainTimer > 0) {
      this.flickerSustainTimer -= dt;
      if (this.flickerSustainTimer <= 0) {
        this.lightsOff = false;
      }
    } else if (this.flickerBurst.length > 0) {
      this.flickerPhaseTimer -= dt;
      if (this.flickerPhaseTimer <= 0) {
        this.flickerBurst.shift();
        this.lightsOff = !this.lightsOff;
        if (this.flickerBurst.length > 0) {
          this.flickerPhaseTimer = this.flickerBurst[0];
        } else if (Math.random() < 0.5) {
          this.lightsOff = true;
          this.flickerSustainTimer = 3;
        } else {
          this.lightsOff = false;
        }
      }
    } else if (!this.meBlinking) {
      this.flickerTimer -= dt;
      if (this.flickerTimer <= 0) {
        this.flickerTimer = 18 + Math.random() * 25;
        this.flickerBurst = [0.05, 0.07, 0.04, 0.1, 0.05, 0.08, 0.3, 0.06, 0.55];
        this.lightsOff = true;
        this.flickerPhaseTimer = this.flickerBurst[0];
      }
    }

    if (wasMoving !== isMoving) {
      player.animFrame = 0;
      player.animTimer = 0;
    }
    const frameDuration = isMoving ? 0.085 / (running ? runMultiplier : 1) : 0.45;
    const frameCount = isMoving ? WALK_FRAMES : IDLE_FRAMES;
    player.animTimer += dt;
    if (player.animTimer >= frameDuration) {
      player.animTimer -= frameDuration;
      player.animFrame = (player.animFrame + 1) % frameCount;
    }

    const pCol = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const pRow = Math.floor(player.y / TILE_SIZE);
    const occluded = museumMap[pRow + 1]?.[pCol] === TILES.WALL;
    const fadeSpeed = 1.5;
    this.glowAlpha = occluded
      ? Math.min(1, this.glowAlpha + fadeSpeed * dt)
      : Math.max(0, this.glowAlpha - fadeSpeed * dt);

    this.camera.follow(
      player.x + player.width / 2,
      player.y + player.height / 2,
      dt
    );

    this.dustSpawnTimer -= dt;
    if (this.dustSpawnTimer <= 0) {
      this.dustSpawnTimer = 0.12;
      const dustCount = this.particles.filter(p => p.type === 'dust').length;
      if (dustCount < 38) { this.spawnDustMote(); this.spawnDustMote(); }
    }

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

    if (this.currentNearby) {
      this.sparkleTimer -= dt;
      if (this.sparkleTimer <= 0) {
        this.sparkleTimer = 0.13;
        this.spawnPedestalSparkle();
      }
    } else {
      this.sparkleTimer = 0;
    }

    this.onPositionChange?.(this.player.x, this.player.y);
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

  private spawnDustMote() {
    const x = this.camera.x + Math.random() * this.canvas.width;
    const y = this.camera.y + Math.random() * this.canvas.height;
    const maxLife = 10 + Math.random() * 10;
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 14,
      vy: -(8 + Math.random() * 18),
      life: maxLife, maxLife,
      size: 0.7 + Math.random() * 1.5,
      r: 225 + Math.floor(Math.random() * 30),
      g: 165 + Math.floor(Math.random() * 45),
      b: 75 + Math.floor(Math.random() * 55),
      type: 'dust',
      phase: Math.random() * Math.PI * 2,
      freq: 0.35 + Math.random() * 0.55,
      amp: 8 + Math.random() * 14,
      sortRow: 0, maxAlpha: 0.48,
    });
  }

  private spawnFootstepDust() {
    const { player } = this;
    const footX = player.x + player.width / 2;
    const footY = player.y + player.height - 6 - TILE_SIZE / 4;
    const sortRow = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 15 + Math.random() * 45;
      const maxLife = 0.25 + Math.random() * 0.35;
      const v = Math.floor(Math.random() * 22) - 11;
      this.particles.push({
        x: footX + (Math.random() - 0.5) * 24,
        y: footY + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife, maxLife,
        size: 1.5 + Math.random() * 2,
        r: Math.min(255, 201 + v), g: Math.min(255, 168 + v), b: Math.min(255, 124 + v),
        type: 'footstep', phase: 0, freq: 0, amp: 0,
        sortRow, maxAlpha: 0.45,
      });
    }
  }

  private spawnPedestalSparkle() {
    if (!this.currentNearby) return;
    const { row, col } = this.currentNearby;
    const pedestalCX = col * TILE_SIZE + TILE_SIZE / 2;
    const pedestalCY = row * TILE_SIZE + TILE_SIZE / 2;
    const playerCX = this.player.x + this.player.width / 2;
    const playerCY = this.player.y + this.player.height / 2;
    const dist = Math.hypot(playerCX - pedestalCX, playerCY - pedestalCY);
    const proximity = Math.max(0, 1 - dist / (TILE_SIZE * 3));
    const baseX = pedestalCX + (Math.random() - 0.5) * TILE_SIZE * 0.9;
    const baseY = row * TILE_SIZE + (Math.random() - 0.5) * TILE_SIZE * 0.6;
    const maxLife = 0.9 + Math.random() * 0.9;
    const isSage = Math.random() > 0.45;
    this.particles.push({
      x: baseX, y: baseY,
      vx: (Math.random() - 0.5) * 28,
      vy: -(45 + Math.random() * 65),
      life: maxLife, maxLife,
      size: 0.9 + Math.random() * 1.6,
      r: isSage ? 122 : 252, g: isSage ? 158 : 200, b: isSage ? 126 : 80,
      type: 'sparkle', phase: 0, freq: 0, amp: 0,
      sortRow: row, maxAlpha: 0.3 + proximity * 0.55,
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      const elapsed = p.maxLife - p.life;
      if (p.type === 'dust') {
        p.x += (p.vx + Math.sin(elapsed * p.freq + p.phase) * p.amp) * dt;
        p.y += p.vy * dt;
      } else if (p.type === 'footstep') {
        const drag = Math.pow(0.15, dt);
        p.vx *= drag; p.vy *= drag;
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else {
        const drag = Math.pow(0.6, dt);
        p.vx *= drag; p.vy *= drag;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, camX: number, camY: number, viewW: number, viewH: number, layer: 'footstep' | 'sparkle' | 'dust', atSortRow?: number) {
    for (const p of this.particles) {
      if (p.type !== layer) continue;
      if (atSortRow !== undefined && p.sortRow !== atSortRow) continue;
      const sx = p.x - camX;
      const sy = p.y - camY;
      if (sx < -p.size * 4 || sx > viewW + p.size * 4 ||
          sy < -p.size * 4 || sy > viewH + p.size * 4) continue;
      const t = p.life / p.maxLife;
      let alpha: number;
      if (p.type === 'dust') {
        const fadeIn  = Math.min(1, (1 - t) / 0.12);
        const fadeOut = Math.min(1, t / 0.18);
        alpha = Math.min(fadeIn, fadeOut) * p.maxAlpha;
      } else if (p.type === 'footstep') {
        alpha = t * p.maxAlpha;
      } else {
        alpha = Math.sin(t * Math.PI) * p.maxAlpha;
      }
      if (alpha <= 0) continue;
      if (p.type === 'sparkle') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
      }
      ctx.beginPath();
      ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`;
      ctx.fill();
      if (p.type === 'sparkle') ctx.restore();
    }
  }

  private render() {
    this.drawScene(
      this.ctx,
      Math.round(this.camera.x),
      Math.round(this.camera.y),
      this.canvas.width,
      this.canvas.height,
      this.player,
      this.glowAlpha,
    );
  }

  // Renders the full map (all tiles, all sprites) into destCanvas, sized automatically.
  // Call this only after onReady has fired. Player appears at spawn facing east.
  public renderFull(destCanvas: HTMLCanvasElement) {
    const TOP_PAD = 2 * TILE_SIZE;
    const BOT_PAD = 2 * TILE_SIZE;
    destCanvas.width  = museumMap[0].length * TILE_SIZE;
    destCanvas.height = museumMap.length    * TILE_SIZE + TOP_PAD + BOT_PAD;
    const ctx = destCanvas.getContext('2d')!;
    this.drawScene(
      ctx,
      0,        // camX: column 0 aligned to canvas left
      -TOP_PAD, // camY: row 0 appears at y=TOP_PAD, leaving room for wall tops
      destCanvas.width,
      destCanvas.height,
      { x: PLAYER_SPAWN_COL * TILE_SIZE, y: PLAYER_SPAWN_ROW * TILE_SIZE,
        width: TILE_SIZE, height: TILE_SIZE, speed: 0,
        facing: 'east', isMoving: false, animFrame: 0, animTimer: 0 },
      0,
    );
  }

  private drawScene(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    player: typeof this.player,
    glowAlpha: number,
    renderParticles = true,
  ) {
    ctx.imageSmoothingEnabled = false;

    // Background — shows through VOID tiles
    ctx.fillStyle = COLORS.CANVAS_BG;
    ctx.fillRect(0, 0, viewW, viewH);

    // Extra rows above so tall wall sprites (up to 3 tiles high) don't pop in.
    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE) - 2);
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE) - 5);
    const endCol   = Math.min(museumMap[0].length - 1, Math.ceil((camX + viewW)  / TILE_SIZE) + 2);
    const endRow   = Math.min(museumMap.length - 1,    Math.ceil((camY + viewH) / TILE_SIZE) + 2);

    // Returns 'left', 'middle', 'right', or null for non-horizontal wall tiles.
    // Left/right edges: one horizontal neighbor is non-wall; middle: both are wall.
    const horizWallType = (row: number, col: number): 'left' | 'middle' | 'right' | null => {
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
    };

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
        if (this.floorSpritesLoaded === 2 && (TILE_COLORS[tile] ?? TILE_COLORS[TILES.FLOOR]) === COLORS.FLOOR) {
          ctx.drawImage(this.floorSprites[(row * 7 + col * 13) & 1], screenX, screenY, TILE_SIZE, TILE_SIZE);
        }

        if (tile === TILES.WALL && this.floorSpritesLoaded === 2) {
          const isFloorTile = (t: number | undefined) =>
            t !== undefined && t !== TILES.VOID && (TILE_COLORS[t] ?? TILE_COLORS[TILES.FLOOR]) === COLORS.FLOOR;
          if (isFloorTile(museumMap[row]?.[col - 1])) {
            const img = this.floorSprites[(row * 7 + (col - 1) * 13) & 1];
            ctx.drawImage(img, img.naturalWidth / 2, 0, img.naturalWidth / 2, img.naturalHeight,
              screenX, screenY, TILE_SIZE / 2, TILE_SIZE);
          }
          if (isFloorTile(museumMap[row]?.[col + 1])) {
            const img = this.floorSprites[(row * 7 + (col + 1) * 13) & 1];
            ctx.drawImage(img, 0, 0, img.naturalWidth / 2, img.naturalHeight,
              screenX + TILE_SIZE / 2, screenY, TILE_SIZE / 2, TILE_SIZE);
          }
        }
      }
    }

    // Pass 2: y-sorted sprites — within each sort row: wall-tops → knubs → walls → player → objects.
    // Returns rotation for a 3-neighbor intersection, or null if not one.
    // Sprite faces left+top+right (missing S = 0°); rotate to match missing side.
    const intersectAngle = (row: number, col: number): number | null => {
      if (museumMap[row]?.[col] !== TILES.WALL) return null;
      const hasN = museumMap[row-1]?.[col] === TILES.WALL;
      const hasS = museumMap[row+1]?.[col] === TILES.WALL;
      const hasE = museumMap[row]?.[col+1] === TILES.WALL;
      const hasW = museumMap[row]?.[col-1] === TILES.WALL;
      if ((hasN?1:0)+(hasS?1:0)+(hasE?1:0)+(hasW?1:0) !== 3) return null;
      if (!hasS) return 0;
      if (!hasW) return Math.PI / 2;
      if (!hasN) return Math.PI;
      return -Math.PI / 2;
    };

    const playerSortRow = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);
    const nsewDirs: Array<['N'|'S'|'E'|'W', number, number]> = [['N',-1,0],['S',1,0],['E',0,1],['W',0,-1]];

    for (let sortRow = startRow; sortRow <= endRow + 1; sortRow++) {
      const row = sortRow - 1;
      const inRange = row >= 0 && row < museumMap.length;

      // Vertical wall-top sprites (null horizWallType walls)
      if (inRange && (this.wallTopSpritesLoaded === 7 || this.wallTopIntersectReady)) {
        for (let col = startCol; col <= endCol; col++) {
          if (museumMap[row][col] !== TILES.WALL || horizWallType(row, col) !== null) continue;
          const screenX = col * TILE_SIZE - camX;
          const screenY = row * TILE_SIZE - camY;
          const hasN = museumMap[row-1]?.[col] === TILES.WALL;
          const hasS = museumMap[row+1]?.[col] === TILES.WALL;
          const hasE = museumMap[row]?.[col+1] === TILES.WALL;
          const hasW = museumMap[row]?.[col-1] === TILES.WALL;
          const neighborCount = (hasN?1:0)+(hasS?1:0)+(hasE?1:0)+(hasW?1:0);
          const iAngle = intersectAngle(row, col);
          let angle: number;
          let sprite: HTMLImageElement | null;
          if (neighborCount === 4 && this.wallTopCrossReady) {
            angle  = ((row * 13 + col * 7) % 4) * (Math.PI / 2);
            sprite = this.wallTopCrossSprite;
          } else if (iAngle !== null && this.wallTopIntersectReady) {
            angle  = iAngle;
            sprite = this.wallTopIntersectSprite;
          } else if (neighborCount < 3 && this.wallTopSpritesLoaded === 7) {
            angle  = Math.PI / 2;
            sprite = this.wallTopSprites[(row * 11 + col * 17) % 7];
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
      if (inRange && this.wallTopKnubReady) {
        for (let col = startCol; col <= endCol; col++) {
          if (museumMap[row][col] !== TILES.WALL) continue;
          const wallNeighbors = nsewDirs.filter(([,dr,dc]) => museumMap[row+dr]?.[col+dc] === TILES.WALL);
          if (wallNeighbors.length !== 1) continue;
          const [dir] = wallNeighbors[0];
          const angle = dir === 'W' ? 0 : dir === 'E' ? Math.PI : dir === 'N' ? -Math.PI/2 : Math.PI/2;
          const screenX = col * TILE_SIZE - camX;
          const screenY = row * TILE_SIZE - camY;
          ctx.save();
          ctx.translate(screenX + TILE_SIZE / 2, screenY - 1.5 * TILE_SIZE);
          ctx.rotate(angle);
          ctx.drawImage(this.wallTopKnubSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
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
          if (type === 'left'   && this.wallHLeftReady)           img = this.wallHLeftSprite;
          if (type === 'right'  && this.wallHRightReady)          img = this.wallHRightSprite;
          if (type === 'middle' && this.wallHSpritesLoaded === 5) img = this.wallHSprites[(row * 7 + col * 13) % 5];
          if (!img) continue;
          ctx.drawImage(img, screenX, screenY - 1 * TILE_SIZE, TILE_SIZE, 2 * TILE_SIZE);
          if (type === 'middle') {
            const iAngle = intersectAngle(row, col);
            if (iAngle !== null && this.wallTopIntersectReady) {
              ctx.save();
              ctx.translate(screenX + TILE_SIZE / 2, screenY - 1.5 * TILE_SIZE);
              ctx.rotate(iAngle);
              ctx.drawImage(this.wallTopIntersectSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
              ctx.restore();
            } else if (iAngle === null && this.wallTopSpritesLoaded === 7) {
              ctx.drawImage(this.wallTopSprites[(row * 11 + col * 17) % 7], screenX, screenY - 2 * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
          }
          if ((type === 'left' || type === 'right') && this.wallTopCornerReady) {
            const hasN = museumMap[row - 1]?.[col] === TILES.WALL;
            const hasS = museumMap[row + 1]?.[col] === TILES.WALL;
            if (hasN || hasS) {
              const hasW = type === 'right';
              const angle = hasN && hasW ? 0 : hasN ? Math.PI / 2 : hasW ? -Math.PI / 2 : Math.PI;
              ctx.save();
              ctx.translate(screenX + TILE_SIZE / 2, screenY - 1.5 * TILE_SIZE);
              ctx.rotate(angle);
              ctx.drawImage(this.wallTopCornerSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
              ctx.restore();
            }
          }
        }
      }

      // "Me" desk sprite — static scene at the right end of the hallway
      if (sortRow === NPC_ROW && this.meSpriteReady) {
        const drawH = TILE_SIZE * 2.5;
        let activeMe: HTMLImageElement;
        if (this.lightsOff && this.meLightOffReady) {
          activeMe = this.meLightOffSprite;
        } else {
          activeMe = (this.meBlinking && this.meBlinkReady) ? this.meBlinkSprite : this.meSprite;
        }
        const drawW = TILE_SIZE * 3;
        const centerX = Math.round(NPC_COL * TILE_SIZE - camX + TILE_SIZE / 2);
        const sy = Math.round(NPC_ROW * TILE_SIZE - camY) - TILE_SIZE * 1.25;
        ctx.drawImage(activeMe, centerX - drawW / 2, sy, drawW, drawH);
      }

      // Footstep particles — drawn at their captured sort row, beneath the player sprite
      if (renderParticles) {
        this.drawParticles(ctx, camX, camY, viewW, viewH, 'footstep', sortRow);
      }

      // Player
      if (sortRow === playerSortRow) {
        const drawH = TILE_SIZE * 4;
        const centerX = Math.round(player.x - camX + player.width / 2);
        const sy = Math.round(player.y - camY) - TILE_SIZE * 2.65;
        const drawImg = (img: HTMLImageElement) => {
          if (!img.complete || img.naturalWidth === 0) return;
          const drawW = drawH * (img.naturalWidth / img.naturalHeight);
          ctx.drawImage(img, centerX - drawW / 2, sy, drawW, drawH);
        };
        if (!player.isMoving && player.facing === 'north') {
          drawImg(this.northIdleSprite);
        } else {
          const frames = (player.isMoving ? this.walkSprites : this.idleSprites).get(player.facing);
          const frame = frames?.[player.animFrame];
          if (frame) drawImg(frame);
        }
      }

      // Objects and glow
      if (inRange) {
        for (let col = startCol; col <= endCol; col++) {
          const screenX = col * TILE_SIZE - camX;
          const screenY = row * TILE_SIZE - camY;

const obj = objectMap[row][col];
          if (obj === null) continue;
          if (obj === 1 && this.pedestalReady) {
            ctx.drawImage(this.pedestalSprite, screenX, screenY, TILE_SIZE, TILE_SIZE * 2);
          } else {
            const pad = Math.round(TILE_SIZE / 5);
            ctx.fillStyle = OBJECT_COLORS[obj] ?? "#888888";
            ctx.fillRect(screenX + pad, screenY + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2);
          }
        }

        // Sparkles — drawn after the pedestal sprite at their stored sort row,
        // independent of currentNearby so they fade out naturally after leaving range
        if (renderParticles) {
          this.drawParticles(ctx, camX, camY, viewW, viewH, 'sparkle', row);
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

    if (renderParticles) this.drawParticles(ctx, camX, camY, viewW, viewH, 'dust');

    // Debug: solid-tile outlines + entity boxes drawn on top of everything (VOID excluded)
    if (this.debugPhysics) {
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
}
