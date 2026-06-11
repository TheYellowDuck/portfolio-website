// Sprite loading + readiness tracking, extracted from engine.ts.
//
// Every sprite the renderer might draw is registered here. `_total` is
// incremented synchronously at registration and each image decrements via
// `markLoaded()`; once all tracked sprites have loaded, `onReady` fires exactly
// once. Character animation frames are NOT tracked and are loaded **lazily per
// direction** via `frames()` (only the spawn-facing frames are pre-warmed), so
// entering the game doesn't fetch all ~83 frames up front.
//
// `cacheBust` appends `?v=<token>` so /map-snapshot can bypass the browser
// cache; the live game omits it and loads from cache normally.

import { IDLE_FRAMES, WALK_FRAMES, IDLE_DIRS, WALK_DIRS, type Direction } from "./player";

export class SpriteRegistry {
  onReady: (() => void) | null = null;
  onProgress: ((loaded: number, total: number) => void) | null = null;

  floorSprites: [HTMLImageElement, HTMLImageElement];
  floorSpritesLoaded = 0;
  wallHSprites: HTMLImageElement[] = [];
  wallHSpritesLoaded = 0;
  wallTopSprites: HTMLImageElement[] = [];
  wallTopSpritesLoaded = 0;
  wallHLeftSprite: HTMLImageElement;
  wallHLeftReady = false;
  wallHRightSprite: HTMLImageElement;
  wallHRightReady = false;
  wallTopKnubSprite: HTMLImageElement;
  wallTopKnubReady = false;
  wallTopCornerSprite: HTMLImageElement;
  wallTopCornerReady = false;
  wallTopIntersectSprite: HTMLImageElement;
  wallTopIntersectReady = false;
  wallTopCrossSprite: HTMLImageElement;
  wallTopCrossReady = false;
  pedestalSprite: HTMLImageElement;
  pedestalReady = false;
  meSprite: HTMLImageElement;
  meSpriteReady = false;
  meBlinkSprite: HTMLImageElement;
  meBlinkReady = false;
  meLightOffSprite: HTMLImageElement;
  meLightOffReady = false;
  northIdleSprite: HTMLImageElement = new Image();
  duckSheet: HTMLImageElement = new Image(); // easter-egg duck (untracked)
  /** Last player frame that actually decoded — the renderer falls back to it so
   *  the character never blinks out while a new direction's frames lazy-load. */
  lastPlayerFrame: HTMLImageElement | null = null;
  private idleSprites: Map<Direction, HTMLImageElement[]> = new Map();
  private walkSprites: Map<Direction, HTMLImageElement[]> = new Map();
  private url!: (path: string) => string;

  private _loaded = 0;
  private _total = 0;

  /** Number of tracked sprites (known synchronously after construction). */
  get total() { return this._total; }

  private markLoaded() {
    this._loaded++;
    this.onProgress?.(this._loaded, this._total);
    if (this._loaded >= this._total) this.onReady?.();
  }

  private loadFrames(
    state: "idle" | "walk",
    dir: Direction,
    track?: (img: HTMLImageElement) => HTMLImageElement,
  ): HTMLImageElement[] {
    const cache = state === "idle" ? this.idleSprites : this.walkSprites;
    let arr = cache.get(dir);
    if (!arr) {
      const count = state === "idle" ? IDLE_FRAMES : WALK_FRAMES;
      arr = [];
      for (let i = 0; i < count; i++) {
        const img = track ? track(new Image()) : new Image();
        img.src = this.url(`/assets/sprites/character/states/standing/animations/${state}/${dir}/frame_${String(i).padStart(3, "0")}.png`);
        arr.push(img);
      }
      cache.set(dir, arr);
    }
    return arr;
  }

  /** Lazily load (and cache) a facing direction's animation frames on first use. */
  frames(state: "idle" | "walk", dir: Direction): HTMLImageElement[] {
    return this.loadFrames(state, dir);
  }

  /** Warm every direction's frames (call once the game is interactive) so the
   *  first turn to a new facing is already decoded — no lazy-load fallback. */
  prewarmAll() {
    for (const dir of WALK_DIRS) this.loadFrames("walk", dir);
    for (const dir of IDLE_DIRS) this.loadFrames("idle", dir);
  }

  constructor(cacheBust?: string) {
    const url = (this.url = (path: string) => (cacheBust ? `${path}?v=${cacheBust}` : path));
    // Register a sprite for readiness tracking: bump total now, then count it
    // exactly once on load OR error. Counting errors too is critical — without
    // it, a single failed/blocked sprite (e.g. mobile Safari hitting its image
    // decode budget) would leave onReady unfired and hang the loading screen.
    const tracked = (img: HTMLImageElement, onLoad?: () => void): HTMLImageElement => {
      this._total++;
      let counted = false;
      const done = (ok: boolean) => {
        if (counted) return;
        counted = true;
        if (ok) onLoad?.();
        this.markLoaded();
      };
      img.onload = () => done(true);
      img.onerror = () => done(false);
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

    this.northIdleSprite.src = url("/assets/sprites/character/states/standing/rotations/north.png");
    this.duckSheet.src = url("/assets/sprites/duck.png");
    // Pre-warm AND track the spawn-facing (east) frames, so onReady doesn't fire
    // until the player can actually be drawn — otherwise the first game load shows
    // a blank player that "reloads" once its frames decode. Other directions stay
    // lazy (loaded on first use / prewarmAll).
    this.loadFrames("idle", "east", tracked);
    this.loadFrames("walk", "east", tracked);
  }
}
