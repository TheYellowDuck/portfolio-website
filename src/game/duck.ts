// Easter-egg duck — a little state machine that animates a 32px spritesheet
// (public/assets/sprites/duck.png, 15 cols × 22 rows). Animation index N lives on
// sheet row N-1; row 11 (index 12, "swim") is intentionally unused. The duck starts
// hidden ("empty") and begins looping through the transition graph on first trigger.

const FRAME = 32;     // px per frame (sheet is 480×704 → 32×32 cells)
const FPS = 8;        // animation speed
const EMPTY_SECONDS = 1.4; // how long it stays gone before maybe resurfacing
const SELF_WEIGHT = 3; // self-loop states are this many× more likely to repeat

type DuckState = number | "empty";

// index → number of frames (columns) used in that row.
const FRAMES: Record<number, number> = {
  1: 4,  // stand to sit
  2: 5,  // sit idle
  3: 4,  // sit to stand
  4: 5,  // stand idle
  5: 8,  // walk
  6: 5,  // sleep
  7: 15, // full eat
  8: 4,  // stand to eat
  9: 7,  // eat idle
  10: 4, // eat to stand
  11: 5, // float idle
  13: 3, // tail up dive
  14: 8, // tail up
  15: 9, // dive down
  16: 6, // dive
  17: 5, // surface up
};

// One-way transition graph (from the spritesheet's animation connections).
const NEXT: Record<string, DuckState[]> = {
  "1": [2, 6, 11],
  "2": [2, 3, 6, 11],
  "3": [4, 5, 7, 8],
  "4": [1, 4, 5, 7, 8],
  "5": [1, 4, 5, 7, 8],
  "6": [2, 3, 6, 11],
  "7": [1, 4, 5],
  "8": [9],
  "9": [9, 10],
  "10": [4, 5],
  "11": [2, 3, 6, 11, 13, 15],
  "13": [14],
  "14": [14, 16],
  "15": [17, "empty"],
  "16": [17, "empty"],
  "17": [2, 6, 11],
  "empty": [17, "empty"],
};

// Behaviour cluster of a state — the duck won't bounce straight back into the
// eating (7-10) or diving (13-17) group it just left.
function cluster(s: DuckState): "eating" | "diving" | "none" {
  if (typeof s === "number") {
    if (s >= 7 && s <= 10) return "eating";
    if (s >= 13 && s <= 17) return "diving";
  }
  return "none";
}

function weightedPick(opts: DuckState[], weights: number[]): DuckState {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < opts.length; i++) {
    r -= weights[i];
    if (r < 0) return opts[i];
  }
  return opts[opts.length - 1];
}

export class Duck {
  private active = false;
  private state: DuckState = "empty";
  private prevState: DuckState = "empty";
  private frame = 0;
  private timer = 0;

  /** Begin the loop (first easter-egg trigger). Idempotent. */
  start() {
    if (this.active) return;
    this.active = true;
    this.state = 17; // "surface up" — the duck pops into view
    this.prevState = "empty";
    this.frame = 0;
    this.timer = 0;
  }

  update(dt: number) {
    if (!this.active) return;
    this.timer += dt;

    if (this.state === "empty") {
      if (this.timer >= EMPTY_SECONDS) this.transition();
      return;
    }

    const frameDur = 1 / FPS;
    while (this.timer >= frameDur) {
      this.timer -= frameDur;
      this.frame++;
      if (this.frame >= (FRAMES[this.state] ?? 1)) {
        this.transition();
        return;
      }
    }
  }

  private transition() {
    const from = cluster(this.prevState);
    let opts = NEXT[String(this.state)] ?? ["empty"];
    // Don't re-enter the eating/diving cluster we just left (no eat→stand→eat
    // or dive→surface→dive bouncing).
    if (this.state !== "empty" && from !== "none" && cluster(this.state) !== from) {
      const filtered = opts.filter((o) => cluster(o) !== from);
      if (filtered.length) opts = filtered;
    }
    // Bias self-loops so idle animations linger (the hidden "empty" stays neutral).
    const weights = opts.map((o) => (o === this.state && this.state !== "empty" ? SELF_WEIGHT : 1));
    this.prevState = this.state;
    this.state = weightedPick(opts, weights);
    this.frame = 0;
    this.timer = 0;
  }

  /** True while the duck is visible (active and not in the hidden "empty" state). */
  get visible() {
    return this.active && this.state !== "empty";
  }

  /**
   * Draw the duck centered on (cx, cy), with a soft floating shadow on the ground
   * at `shadowY`. No-op while hidden (so the shadow disappears with the duck).
   */
  draw(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, cx: number, cy: number, shadowY: number, size: number) {
    if (!this.visible) return;
    if (!sheet.complete || sheet.naturalWidth === 0) return;

    // Floating shadow on the tile below.
    ctx.save();
    ctx.fillStyle = "rgba(20, 14, 4, 0.25)";
    ctx.beginPath();
    ctx.ellipse(Math.round(cx), Math.round(shadowY), size * 0.34, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sprite, centered.
    const sx = this.frame * FRAME;
    const sy = ((this.state as number) - 1) * FRAME; // row = index - 1
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sheet, sx, sy, FRAME, FRAME,
      Math.round(cx - size / 2), Math.round(cy - size / 2), size, size,
    );
  }
}
