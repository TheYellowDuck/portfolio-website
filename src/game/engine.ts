// Game engine — orchestration only. The heavy lifting lives in sibling modules:
//   player.ts     movement, facing, walk/idle animation
//   collision.ts  tile-based AABB resolution (used by Player)
//   sprites.ts    sprite loading + readiness tracking
//   particles.ts  dust / footstep / sparkle particle pool
//   renderer.ts   the three-pass y-sorted scene draw
//
// This file owns the canvas, input, camera, those subsystems, and the per-frame
// loop; it translates game state into the React-facing event stream (`onEvent`)
// and ambient "me at desk" blink/flicker timing. It never imports React — the
// only bridge is the callbacks below.

import InputManager from "./input";
import { Camera } from "./camera";
import {
  TILE_SIZE,
  TILES,
  museumMap,
  setTileAt,
  setSolidAt,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
} from "./tilemap";
import { getNearbyInteractable, interactables, Interactable } from "./interactables";
import { Exhibit } from "@/data/projects";
import { Player } from "./player";
import { SpriteRegistry } from "./sprites";
import { ParticleSystem } from "./particles";
import { drawScene } from "./renderer";
import { Duck } from "./duck";
import { findPath, findPathToward, smoothPath, type Cell } from "./pathfinding";

export type GameEvent =
  | { type: "nearby"; content: Exhibit }
  | { type: "interact"; content: Exhibit }
  | { type: "leave" }
  | { type: "idle" }
  | { type: "active" };

// Name shown by the floating exhibit label. Most exhibits have a popup title; the résumé and
// transcript pedestals are type-only (no title), so give them a friendly name. null = no label.
const TYPE_LABELS: Record<string, string> = { resume: "Résumé", transcript: "Education" };
const exhibitLabel = (popup: Exhibit["popup"]): string | null =>
  popup?.title ?? (popup?.type ? TYPE_LABELS[popup.type] ?? null : null);

// Ambient wash: a slow, always-warm "golden hour" drift — honey → amber → ember →
// candlelit dusk → back. Stays cozy (never cools to night). Colors drawn from
// color-hex.com's "Sunset Hues and Golden Hour" palette (#F2C460 / #D98748).
// Each stop is [phase 0..1, r, g, b, alpha]; the wash is painted over the scene.
const DAY_CYCLE_SECONDS = 240;
const TINT_STOPS: [number, number, number, number, number][] = [
  [0.00, 242, 196,  96, 0.07], // golden hour — warm honey  #F2C460
  [0.28, 217, 135,  72, 0.12], // late afternoon — amber    #D98748
  [0.52, 194, 100,  60, 0.17], // sunset — warm ember
  [0.74, 158,  84,  54, 0.21], // candlelit dusk — lamplit, still warm
  [0.90, 217, 135,  72, 0.12], // glow returning — amber
  [1.00, 242, 196,  96, 0.07], // loop back to golden hour
];

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: InputManager;
  private camera: Camera;
  private sprites: SpriteRegistry;
  private particles: ParticleSystem;
  private player: Player;

  private animationFrameId = 0;
  private lastTime = 0;
  private paused = false;
  private interactCooldown = false;
  private glowAlpha = 0;
  // Analog movement vector from the on-screen joystick (each axis ~[-1, 1]).
  private moveVec = { x: 0, y: 0 };

  // Seconds elapsed in-game, driving the day/night ambient wash (see currentTint).
  private gameClock = 0;

  // Click-to-move: remaining waypoints the player auto-walks to (manual input cancels).
  private path: Cell[] | null = null;
  private pathStuck = 0;

  // Easter-egg duck (started on first trigger). It floats over the EASTER_EGG
  // marker tile; the tile *below* it is the solid "invisible pedestal".
  private duck = new Duck();
  private eggCol = -1;
  private eggRow = -1;

  // Spawn-cadence timers (game-state dependent — kept here, not in ParticleSystem).
  private footstepTimer = 0;
  private sparkleTimer = 0;
  private dustSpawnTimer = 0;

  // Idle detection (drives the controls hint via onEvent).
  private idleTimer = 0;
  private idleFired = false;
  private currentNearby: Interactable | null = null;
  private labelAlpha = 0; // fades the floating exhibit-name label in/out
  private labelFont = '500 16px ui-monospace, monospace'; // set from --font-pixel in the constructor

  // Ambient "me at desk" animation state.
  private meBlinkTimer = 3 + Math.random() * 2;
  private meBlinking = false;
  private meBlinkDuration = 0;
  private flickerTimer = 18 + Math.random() * 25;
  private flickerBurst: number[] = [];
  private flickerPhaseTimer = 0;
  private flickerSustainTimer = 0;
  private lightsOff = false;

  public onEvent: ((event: GameEvent) => void) | null = null;
  public onReady: (() => void) | null = null;
  public onProgress: ((loaded: number, total: number) => void) | null = null;
  public onPositionChange: ((x: number, y: number) => void) | null = null;
  public onFootstep: ((running: boolean) => void) | null = null;
  public debugPhysics = false;
  // When true the player isn't drawn. `playerAlpha` (0–1) fades the player in/out
  // during the site→game portal transition (the world fades in first, then the player).
  // Starts at 0 (hidden) so the player isn't flashed on screen before the transition's
  // player-reveal stage tweens it in — otherwise first load shows a brief load/fade/reload.
  public hidePlayer = false;
  public playerAlpha = 0;

  /** Total tracked sprites (for a loading progress display). */
  get spritesTotal() { return this.sprites.total; }

  constructor(canvas: HTMLCanvasElement, cacheBust?: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    // Pixel font for the exhibit-name label — read the resolved family from the CSS var and
    // preload it so the first label doesn't flash a fallback face.
    const pixelFam = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim();
    this.labelFont = `500 16px ${pixelFam ? pixelFam + ", " : ""}ui-monospace, monospace`;
    document.fonts?.load(this.labelFont).catch(() => {});
    this.input = new InputManager();
    this.camera = new Camera(canvas.width, canvas.height);
    this.sprites = new SpriteRegistry(cacheBust);
    this.sprites.onReady = () => this.onReady?.();
    this.sprites.onProgress = (loaded, total) => this.onProgress?.(loaded, total);
    this.particles = new ParticleSystem();
    this.player = new Player();

    // Locate the easter-egg tile so the duck can appear there, and make it solid —
    // the duck sits on an "invisible pedestal" the player can't walk through.
    for (let r = 0; r < museumMap.length; r++) {
      for (let c = 0; c < museumMap[0].length; c++) {
        if (museumMap[r][c] === TILES.EASTER_EGG) { this.eggRow = r; this.eggCol = c; }
      }
    }
    // The duck's solid "pedestal" (the tile below it) is added only when the egg is
    // triggered — see triggerDuck() — so before then the spot is fully walkable.
  }

  // First easter-egg trigger: start the duck and add its physics (the solid tile
  // below it). Idempotent — duck.start() and setSolidAt() both no-op if repeated.
  private triggerDuck() {
    this.duck.start();
    if (this.eggCol >= 0) setSolidAt(this.eggCol, this.eggRow + 1, true);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
    this.camera.snapTo(this.player.centerX, this.player.centerY);
  }

  // Bridge for the on-screen joystick — set the analog movement vector (each
  // axis roughly in [-1, 1]); the update loop reads it each frame. (0, 0) idles.
  setMoveVector(x: number, y: number) {
    this.moveVec.x = x;
    this.moveVec.y = y;
  }

  triggerInteract() {
    if (this.currentNearby && !this.interactCooldown) {
      this.onEvent?.({ type: "interact", content: this.currentNearby.content });
      if (this.currentNearby.tileType === TILES.EASTER_EGG) this.triggerDuck();
      this.interactCooldown = true;
      setTimeout(() => { this.interactCooldown = false; }, 500);
    }
  }

  clickAt(screenX: number, screenY: number) {
    if (this.paused) return;
    const col = Math.floor((screenX + this.camera.x) / TILE_SIZE);
    const row = Math.floor((screenY + this.camera.y) / TILE_SIZE);
    const target = interactables.find(i => i.col === col && (i.row === row || i.row === row - 1));
    if (target) {
      if (this.interactCooldown) return;
      this.onEvent?.({ type: "interact", content: target.content });
      if (target.tileType === TILES.EASTER_EGG) this.triggerDuck();
      this.interactCooldown = true;
      setTimeout(() => { this.interactCooldown = false; }, 500);
      return;
    }
    // Click-to-move: walk to the clicked tile if it's reachable. Start from the
    // tile under the player's feet (the rect's bottom — its ground contact).
    const start = {
      col: Math.floor(this.player.centerX / TILE_SIZE),
      row: Math.floor(this.player.centerY / TILE_SIZE),
    };
    const raw = findPath(start, { col, row });
    if (raw && raw.length) { this.path = smoothPath(start, raw); this.pathStuck = 0; }
  }

  private hasManualInput(): boolean {
    const i = this.input;
    return i.isDown("w") || i.isDown("a") || i.isDown("s") || i.isDown("d")
      || i.isDown("ArrowUp") || i.isDown("ArrowDown") || i.isDown("ArrowLeft") || i.isDown("ArrowRight");
  }

  // Steer the player's collision box (its center) toward the next waypoint's tile
  // center as a walk-speed move vector; pop waypoints once reached. Centering the
  // box keeps clearance on every side so it can't catch on a wall corner, and the
  // tight reach still lands the player on the tile's center.
  private followPath(): { x: number; y: number } {
    const WALK = 0.6;                 // joystick magnitude → walk (below the run rim)
    const REACH = TILE_SIZE * 0.14;
    while (this.path && this.path.length) {
      const wp = this.path[0];
      const dx = (wp.col + 0.5) * TILE_SIZE - this.player.centerX;
      const dy = (wp.row + 0.5) * TILE_SIZE - this.player.centerY;
      const d = Math.hypot(dx, dy);
      if (d < REACH) { this.path.shift(); continue; }
      return { x: (dx / d) * WALK, y: (dy / d) * WALK };
    }
    this.path = null;
    return { x: 0, y: 0 };
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.path = null;
    this.input.clear();
    this.moveVec.x = 0;
    this.moveVec.y = 0;
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
    this.camera.snapTo(this.player.centerX, this.player.centerY);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    // Warm the other facings shortly after entry (deferred so it doesn't compete
    // with the tracked first-load decode) — keeps turning flicker-free.
    setTimeout(() => this.sprites.prewarmAll(), 1200);
  }

  /** Walk to a specific tile (e.g. tapped on the minimap). If the tile is blocked,
   *  head to the nearest reachable open tile around it instead. */
  walkToTile(col: number, row: number) {
    if (this.paused) return;
    const start = {
      col: Math.floor(this.player.centerX / TILE_SIZE),
      row: Math.floor(this.player.centerY / TILE_SIZE),
    };
    const raw = findPathToward(start, { col, row });
    if (raw && raw.length) { this.path = smoothPath(start, raw); this.pathStuck = 0; }
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

  private update(dt: number) {
    this.gameClock += dt;
    this.particles.update(dt);
    this.duck.update(dt);

    // Click-to-move: manual input (keyboard or joystick) cancels the auto-walk;
    // otherwise steer toward the active path's next waypoint.
    if (this.path && (this.hasManualInput() || this.moveVec.x !== 0 || this.moveVec.y !== 0)) {
      this.path = null;
    }
    const moveVec = this.path ? this.followPath() : this.moveVec;
    const { isMoving, running } = this.player.move(this.input, dt, moveVec);
    const { player } = this;

    // If collision fully blocks the auto-walk, give up rather than grind a wall.
    if (this.path) {
      if (isMoving) this.pathStuck = 0;
      else if ((this.pathStuck += dt) > 0.4) this.path = null;
    }

    // Footsteps — kick up dust + emit the audio cue on a movement-speed cadence.
    if (isMoving) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = running ? 0.15 : 0.22;
        this.particles.spawnFootstepDust(player);
        this.onFootstep?.(running);
      }
    } else {
      this.footstepTimer = 0;
    }

    // Idle / active — surface the controls hint after 3s of stillness.
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

    this.updateAmbient(dt);

    // Glow — fade in while a wall to the south occludes the player.
    const pCol = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const pRow = Math.floor(player.y / TILE_SIZE);
    const occluded = museumMap[pRow + 1]?.[pCol] === TILES.WALL;
    const fadeSpeed = 1.5;
    this.glowAlpha = occluded
      ? Math.min(1, this.glowAlpha + fadeSpeed * dt)
      : Math.max(0, this.glowAlpha - fadeSpeed * dt);

    this.camera.follow(player.centerX, player.centerY, dt);

    // Ambient dust — keep the pool topped up across the viewport.
    this.dustSpawnTimer -= dt;
    if (this.dustSpawnTimer <= 0) {
      this.dustSpawnTimer = 0.12;
      if (this.particles.countDust() < 38) {
        this.particles.spawnDustMote(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);
        this.particles.spawnDustMote(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);
      }
    }

    // Nearby interactable + E-to-interact.
    const nearby = getNearbyInteractable(player.x, player.y, player.width, player.height);
    if (nearby) {
      if (this.currentNearby !== nearby) {
        this.currentNearby = nearby;
        this.onEvent?.({ type: "nearby", content: nearby.content });
      }
      const ePressed = this.input.isDown("e") || this.input.isDown("E") || this.input.isDown("Enter");
      if (ePressed && !this.interactCooldown) {
        this.onEvent?.({ type: "interact", content: nearby.content });
        if (nearby.tileType === TILES.EASTER_EGG) this.triggerDuck();
        this.interactCooldown = true;
        setTimeout(() => { this.interactCooldown = false; }, 500);
      }
    } else if (this.currentNearby !== null) {
      this.currentNearby = null;
      this.onEvent?.({ type: "leave" });
    }

    // The exhibit's name floats in above it while you're standing at it (not the secret duck).
    const labelOn = !!(this.currentNearby && this.currentNearby.tileType !== TILES.EASTER_EGG && exhibitLabel(this.currentNearby.content.popup));
    this.labelAlpha += ((labelOn ? 1 : 0) - this.labelAlpha) * Math.min(1, dt * 14);

    // Sparkles rise from the pedestal while the player lingers nearby (but not
    // from the easter-egg duck).
    if (this.currentNearby && this.currentNearby.tileType !== TILES.EASTER_EGG) {
      this.sparkleTimer -= dt;
      if (this.sparkleTimer <= 0) {
        this.sparkleTimer = 0.13;
        this.particles.spawnPedestalSparkle(this.currentNearby, player);
      }
    } else {
      this.sparkleTimer = 0;
    }

    this.onPositionChange?.(player.x, player.y);
  }

  // "Me at desk" eye-blink + occasional light-flicker burst. Blinking pauses
  // while a flicker burst runs; bursts only begin between blinks.
  private updateAmbient(dt: number) {
    const flickering = this.flickerBurst.length > 0 || this.flickerSustainTimer > 0;

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
  }

  // Interpolated time-of-day wash color for the current moment in the day cycle.
  private currentTint(): string {
    const p = (this.gameClock / DAY_CYCLE_SECONDS) % 1;
    let i = 0;
    while (i < TINT_STOPS.length - 1 && p > TINT_STOPS[i + 1][0]) i++;
    const a = TINT_STOPS[i], b = TINT_STOPS[i + 1];
    const t = (p - a[0]) / ((b[0] - a[0]) || 1);
    const L = (x: number, y: number) => x + (y - x) * t;
    return `rgba(${Math.round(L(a[1], b[1]))}, ${Math.round(L(a[2], b[2]))}, ${Math.round(L(a[3], b[3]))}, ${L(a[4], b[4]).toFixed(3)})`;
  }

  private render() {
    drawScene(
      this.ctx,
      this.sprites,
      this.particles,
      Math.round(this.camera.x),
      Math.round(this.camera.y),
      this.canvas.width,
      this.canvas.height,
      this.player,
      this.glowAlpha,
      { lightsOff: this.lightsOff, meBlinking: this.meBlinking, tint: this.currentTint() },
      this.debugPhysics,
      this.hidePlayer,
      this.playerAlpha,
      this.drawDuck,
    );
    this.drawExhibitLabel();
  }

  // Floating name above the exhibit you're standing at — just text (dark-outlined for
  // legibility over the floor), no plaque.
  private drawExhibitLabel() {
    const near = this.currentNearby;
    if (this.labelAlpha < 0.02 || !near || near.tileType === TILES.EASTER_EGG) return;
    const title = exhibitLabel(near.content.popup);
    if (!title) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.labelAlpha;
    ctx.font = this.labelFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = Math.round((near.col + 0.5) * TILE_SIZE - this.camera.x);
    // The pedestal sprite draws from its row downward, so the book's top is at the row line —
    // sit just above it. Pure cross-fade, no vertical movement.
    const cy = Math.round(near.row * TILE_SIZE - this.camera.y) - 2;
    // Crisp 2px drop-shadow (no blur) so it reads as pixel art, then the label.
    ctx.fillStyle = "rgba(26,18,8,0.55)";
    ctx.fillText(title, cx, cy + 2);
    ctx.fillStyle = "#fdf3da";
    ctx.fillText(title, cx, cy);
    ctx.restore();
  }

  // y-sorted draw hook for the easter-egg duck: it sits on the egg tile, so it
  // draws at that tile's sort row (the player passes in front when further south).
  private drawDuck = (sortRow: number, camX: number, camY: number) => {
    if (this.eggCol < 0 || sortRow !== this.eggRow) return;
    const cx = (this.eggCol + 0.5) * TILE_SIZE - camX;           // centered in the marker tile
    const cy = (this.eggRow + 0.5) * TILE_SIZE - camY;
    const shadowY = (this.eggRow + 1.5) * TILE_SIZE - camY;      // centered in the solid tile below
    this.duck.draw(this.ctx, this.sprites.duckSheet, cx, cy, shadowY, TILE_SIZE * 0.85);
  };

  // Renders the full map (all tiles, all sprites) into destCanvas, sized
  // automatically. Call only after onReady. Player appears at spawn facing east.
  public renderFull(destCanvas: HTMLCanvasElement) {
    const TOP_PAD = 2 * TILE_SIZE;
    const BOT_PAD = 2 * TILE_SIZE;
    destCanvas.width  = museumMap[0].length * TILE_SIZE;
    destCanvas.height = museumMap.length    * TILE_SIZE + TOP_PAD + BOT_PAD;
    const ctx = destCanvas.getContext('2d')!;
    drawScene(
      ctx,
      this.sprites,
      this.particles,
      0,        // camX: column 0 aligned to canvas left
      -TOP_PAD, // camY: row 0 appears at y=TOP_PAD, leaving room for wall tops
      destCanvas.width,
      destCanvas.height,
      { x: PLAYER_SPAWN_COL * TILE_SIZE, y: PLAYER_SPAWN_ROW * TILE_SIZE,
        width: TILE_SIZE, height: TILE_SIZE,
        facing: 'east', isMoving: false, animFrame: 0 },
      0,
      { lightsOff: this.lightsOff, meBlinking: this.meBlinking },
      this.debugPhysics,
    );
  }
}
