// Ghost trails — other visitors, drifting through the museum as soft glowing wisps. Each ghost
// first replays a recorded path (always at a serene WALK pace, so a recorded sprint is gentled),
// then wanders on its own via pathfinding. When there aren't enough real recordings, the room is
// filled with procedural wanderers so it's never empty. Rendered/advanced by the engine — and on a
// real-time clock, so the ghosts keep drifting even while a popup pauses the player.
import { findPath, smoothPath } from "./pathfinding";
import { solidMap, museumMap, TILES, TILE_SIZE, PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW } from "./tilemap";
import { interactables } from "./interactables";
import { isSolid } from "./collision";

const WALK_SPEED = 200;          // px/s — matches the player's walk; replay & wander move at this
const FADE_IN_S = 1.4;
const PAUSE_MIN = 1.2, PAUSE_MAX = 3.0;   // s of stillness between legs of a stroll
const VIEW_MIN = 1.5, VIEW_MAX = 4.5;     // s a wisp pauses to view from one spot (× its lingerScale)
const LOITER_MIN = 7, LOITER_MAX = 18;    // s a wisp spends loitering around an exhibit before moving on
const HOVER_X = 10, HOVER_Y = 7;          // px — drift so wisps clearly bob/sway, never straight/still
const WEAVE_AMP = 28;                      // px — how far travel weaves off the straight line (anti-b-line)
const OCCL_FADE = 4.5;                      // how fast the behind-wall outline fades in/out (per second)
const PARTICLE_COUNT = 13;       // motes making up the wisp's body (it has no solid core)
const TARGET_MIN = 3, TARGET_MAX = 7;
const GHOST_HALF = TILE_SIZE * 0.19;  // collision half-box; < the player's so any spot a real visitor
                                      // walked stays reachable, while walls stay impassable
const TAIL_LIFE = 0.65;          // s a shed tail spark lives — long, slow fade
const TAIL_INTERVAL = 0.02;      // s between shed sparks while drifting (dense stream)
const TAIL_MAX = 44;             // cap of live tail sparks per wisp
const TAIL_BASE = TILE_SIZE * 0.17;  // half-width the tail starts at (≈ the body's width) before it
                                     // converges to a point — gives the teardrop its wide base

// One shed tail spark — emitted at the orb, left behind as the wisp moves on, then fading.
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number }

// A small palette of warm tints so the wisps belong to the museum's golden-hour glow — honey, amber,
// candlelight, rose-gold, wheat. They read like fireflies / warm wandering spirits rather than cold
// sci-fi orbs. The core stays a near-white cream; the tint colors its mid-glow, halo and trail.
type RGB = [number, number, number];
const TINTS: RGB[] = [
  [247, 206, 120], // honey gold
  [236, 160,  92], // warm amber
  [243, 222, 158], // pale candlelight
  [225, 186, 132], // soft rose-gold
  [212, 204, 138], // wheat
];

const ROWS = solidMap.length;
const COLS = solidMap[0].length;
const walkable = (col: number, row: number) =>
  row >= 0 && row < ROWS && col >= 0 && col < COLS && !solidMap[row][col];

// Each exhibit a wisp can check out, with every walkable tile it's in interaction range from — the
// same radius the player uses, so a wisp needn't stand at the pedestal's front to "view" it. A
// visiting wisp drifts to a *random* in-range tile and lingers, so they don't all crowd one spot.
// The easter-egg duck is left out. (Anchor sits ~1.5 tiles south of the exhibit tile, per interactables.)
interface ExhibitTarget { col: number; row: number; branch: number; tiles: { col: number; row: number }[] }
const EXHIBITS: ExhibitTarget[] = (() => {
  const out: ExhibitTarget[] = [];
  for (const it of interactables) {
    if (it.tileType === TILES.EASTER_EGG) continue;
    const ac = it.col + 0.5, ar = it.row + 1.5, rad = it.radius;   // interaction anchor + radius
    const reach = Math.ceil(rad) + 1;
    const tiles: { col: number; row: number }[] = [];
    for (let dr = -reach; dr <= reach; dr++) {
      for (let dc = -reach; dc <= reach; dc++) {
        const col = it.col + dc, row = it.row + dr;
        if (!walkable(col, row)) continue;
        const ddx = col + 0.5 - ac, ddy = row + 0.5 - ar;
        if (ddx * ddx + ddy * ddy <= rad * rad) tiles.push({ col, row });
      }
    }
    if (tiles.length) out.push({ col: it.col, row: it.row, branch: it.tileType, tiles });
  }
  return out;
})();

interface Segment { x0: number; y0: number; x1: number; y1: number; start: number; dur: number }

interface Ghost {
  segments: Segment[];          // replay timeline (empty for a pure wanderer)
  replayTotal: number;          // ms
  elapsed: number;              // ms into the replay
  replaying: boolean;
  path: { x: number; y: number }[] | null;  // current wander route (world centres)
  pathIdx: number;
  pause: number;                // s of stillness remaining
  x: number; y: number;         // centre, world px
  alpha: number;                // fade-in 0..1
  phase: number;                // particle animation offset
  moving: boolean;
  dx: number; dy: number;       // unit travel direction (tail sparks are shed opposite this)
  moveAmt: number;              // 0..1 smoothed "is moving" → gates tail emission
  tail: Spark[];                // shed tail sparks (the teardrop, made of particles)
  tailTimer: number;            // emission accumulator
  visited: Set<number>;         // EXHIBITS indices already seen (don't revisit until all are)
  targetSpot: number;           // EXHIBITS index it's heading to / lingering at (held so others avoid it)
  lingerScale: number;          // random per-wisp dwell-time multiplier at exhibits
  bobRate: number;              // random per-wisp horizontal-hover frequency
  breathRate: number;           // random per-wisp vertical-hover + breathe frequency
  weaveRate: number;            // random per-wisp serpentine-travel frequency
  atExhibit: number;            // EXHIBITS index currently being loitered around, or -1 (traveling)
  loiterTime: number;           // s of loitering left at the current exhibit
  hx: number; hy: number;       // current hover offset (visual only — not collided), set per frame
  occlAlpha: number;            // 0..1 behind-wall outline opacity, eased in/out as it passes walls
  tint: RGB;                    // this wisp's warm color identity
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// A soft additive spark: a warm cream centre fading out to the wisp's tint. Everything a wisp is made
// of — its body motes and its shed tail sparks — is drawn from these over composite "lighter", so the
// whole thing reads as a little swarm of warm light rather than a solid orb.
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, t: RGB) {
  if (a <= 0.003 || r <= 0) return;
  const [tr, tg, tb] = t;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,246,226,${a})`);
  g.addColorStop(0.5, `rgba(${tr},${tg},${tb},${a * 0.42})`);
  g.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export class GhostSystem {
  private ghosts: Ghost[] = [];
  private reduced = false;       // prefers-reduced-motion → hold the wisps still

  /** Honor prefers-reduced-motion: stop the drifting / hover / pulse and rest each wisp still at an
   *  exhibit — a quiet glowing presence rather than constant ambient motion. */
  setReducedMotion(on: boolean) {
    this.reduced = on;
    if (on) this.restAtExhibits();
  }

  // Place each wisp still at a distinct exhibit so reduced-motion users still see visitors present.
  private restAtExhibits() {
    if (!EXHIBITS.length) return;
    const order = shuffle(EXHIBITS);
    this.ghosts.forEach((g, i) => {
      const e = order[i % order.length];
      const tile = e.tiles[Math.floor(Math.random() * e.tiles.length)];
      g.x = (tile.col + 0.5) * TILE_SIZE;
      g.y = (tile.row + 0.5) * TILE_SIZE;
      g.replaying = false; g.path = null; g.tail = []; g.moveAmt = 0; g.hx = 0; g.hy = 0;
    });
  }

  /** Build the active ghosts from recordings (excluding the current session), padded to a few. */
  load(recordings: { id: string; pts: number[] }[], ownId: string) {
    const pool = recordings.filter((r) => r.id !== ownId && Array.isArray(r.pts) && r.pts.length >= 6);
    const target = TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1));
    const picks = shuffle(pool).slice(0, target);
    this.ghosts = picks.map((r) => this.fromRecording(r.pts));
    let guard = 0;
    while (this.ghosts.length < target && guard++ < target + 4) {
      const w = this.spawnWanderer();
      if (w) this.ghosts.push(w);
    }
    if (this.reduced) this.restAtExhibits();
  }

  private blank(x: number, y: number): Ghost {
    return {
      segments: [], replayTotal: 0, elapsed: 0, replaying: false,
      path: null, pathIdx: 0, pause: Math.random() * 0.8,
      x, y, alpha: 0, phase: Math.random() * Math.PI * 2, moving: false,
      dx: 1, dy: 0, moveAmt: 0, tail: [], tailTimer: 0,
      visited: new Set(), targetSpot: -1,
      lingerScale: 0.55 + Math.random() * 1.1,            // every wisp dwells for its own length
      bobRate: 1.0 + Math.random() * 0.6,
      breathRate: 0.8 + Math.random() * 0.5,
      weaveRate: 0.7 + Math.random() * 0.7,
      atExhibit: -1, loiterTime: 0, hx: 0, hy: 0, occlAlpha: 0,
      tint: TINTS[Math.floor(Math.random() * TINTS.length)],
    };
  }

  // pts: flat [x,y, x,y, …] — replayed as one continuous stroll at a constant walk pace, which is
  // what gentles a recorded run into a walk.
  private fromRecording(pts: number[]): Ghost {
    const segs: Segment[] = [];
    let cursor = 0;
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const x0 = pts[i], y0 = pts[i + 1], x1 = pts[i + 2], y1 = pts[i + 3];
      const dist = Math.hypot(x1 - x0, y1 - y0);
      if (dist < 0.5) continue;
      const dur = (dist / WALK_SPEED) * 1000;
      segs.push({ x0, y0, x1, y1, start: cursor, dur });
      cursor += dur;
    }
    const g = this.blank(pts[0] ?? 0, pts[1] ?? 0);
    g.segments = segs;
    g.replayTotal = cursor;
    g.replaying = segs.length > 0;
    return g;
  }

  private spawnWanderer(): Ghost | null {
    // Visitors all enter at the exact same spot (like the player), then each sets off to the exhibits
    // at a slightly different moment so they peel away one by one rather than as a block.
    if (!walkable(PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW)) return null;
    const g = this.blank((PLAYER_SPAWN_COL + 0.5) * TILE_SIZE, (PLAYER_SPAWN_ROW + 0.5) * TILE_SIZE);
    g.pause = Math.random() * 4;
    return g;
  }

  /** Advance on a real-time dt (called every frame, even while the player is paused). */
  update(dt: number) {
    for (const g of this.ghosts) {
      g.alpha = Math.min(1, g.alpha + dt / FADE_IN_S);
      if (this.reduced) continue;   // reduced motion: a still, gently-glowing presence — no drift/pulse
      g.phase += dt;
      // 2D hover (visual only): a clearly-visible float — a slow drift plus a faster wobble — so the
      // wisp never travels perfectly straight nor sits perfectly still. Every wisp, replay & simulated.
      g.hx = (Math.sin(g.phase * g.bobRate + 1.7) + 0.4 * Math.sin(g.phase * g.bobRate * 2.6)) * HOVER_X;
      g.hy = (Math.sin(g.phase * g.breathRate) + 0.35 * Math.sin(g.phase * g.breathRate * 2.2 + 1.0)) * HOVER_Y;
      const px = g.x, py = g.y;
      if (g.replaying) this.stepReplay(g, dt);
      else this.stepWander(g, dt);

      // Track travel direction + a smoothed "moving" amount that gates tail emission.
      const mvx = g.x - px, mvy = g.y - py;
      const dist = Math.hypot(mvx, mvy);
      g.moving = dist > 0.3;
      g.moveAmt += ((g.moving ? 1 : 0) - g.moveAmt) * Math.min(1, dt * 6);
      if (dist > 0.01) { g.dx = mvx / dist; g.dy = mvy / dist; }

      // Ease the behind-wall outline in/out as the wisp passes behind (or clear of) a wall.
      const occluded = museumMap[Math.floor(g.y / TILE_SIZE) + 1]?.[Math.floor(g.x / TILE_SIZE)] === TILES.WALL;
      g.occlAlpha += ((occluded ? 1 : 0) - g.occlAlpha) * Math.min(1, dt * OCCL_FADE);

      // Age the shed sparks; drop the dead ones.
      for (let i = g.tail.length - 1; i >= 0; i--) {
        const s = g.tail[i];
        s.life -= dt;
        if (s.life <= 0) { g.tail.splice(i, 1); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt;
      }
      // Shed new sparks while drifting — each at the orb with a little spread, drifting back + up.
      g.tailTimer -= dt;
      if (g.moveAmt > 0.2) {
        while (g.tailTimer <= 0) {
          g.tailTimer += TAIL_INTERVAL;
          if (g.tail.length >= TAIL_MAX) continue;
          const px2 = -g.dy, py2 = g.dx;                 // perpendicular to travel
          const jp = (Math.random() * 2 - 1) * TAIL_BASE; // start spread across the body width …
          const back = 8 + Math.random() * 8;
          const life = TAIL_LIFE * (0.7 + Math.random() * 0.5);
          const conv = -jp / life;                        // … then drift back to centre → a point
          g.tail.push({
            x: g.x + g.hx + px2 * jp, y: g.y + g.hy + py2 * jp,   // shed from the hovered body
            vx: -g.dx * back + px2 * conv + (Math.random() * 2 - 1) * 4,
            vy: -g.dy * back + py2 * conv + (Math.random() * 2 - 1) * 4 - 4,
            life, max: life, size: 1.8 + Math.random() * 1.6,
          });
        }
      } else {
        g.tailTimer = 0;
      }
    }
  }

  private stepReplay(g: Ghost, dt: number) {
    g.elapsed += dt * 1000;
    if (g.elapsed >= g.replayTotal) {
      const last = g.segments[g.segments.length - 1];
      this.moveTo(g, last.x1, last.y1);
      g.replaying = false;                 // recording over → go check out the exhibits from here
      g.pause = PAUSE_MIN + Math.random() * (PAUSE_MAX - PAUSE_MIN);
      return;
    }
    let seg = g.segments[0];
    for (const s of g.segments) { if (g.elapsed >= s.start) seg = s; else break; }
    const f = seg.dur > 0 ? Math.min(1, (g.elapsed - seg.start) / seg.dur) : 1;
    this.moveTo(g, seg.x0 + (seg.x1 - seg.x0) * f, seg.y0 + (seg.y1 - seg.y0) * f);
  }

  private stepWander(g: Ghost, dt: number) {
    if (g.atExhibit >= 0) g.loiterTime -= dt;   // counting down our stay at the current exhibit
    if (g.pause > 0) { g.pause -= dt; return; }

    if (!g.path || g.pathIdx >= g.path.length) {
      if (g.atExhibit >= 0 && g.loiterTime > 0) {
        this.hopWithinExhibit(g);             // mill about the same exhibit, viewing from another spot
        if (!g.path || g.pathIdx >= g.path.length) { g.path = null; g.pause = 0.4 + Math.random() * 1.4; return; }
      } else {
        g.atExhibit = -1;                     // done here (or just set off) → head for a new exhibit
        this.pickVisit(g);
        // pickVisit can fail or yield a degenerate (≤1 point) route — bail rather than index past it.
        if (!g.path || g.pathIdx >= g.path.length) { g.path = null; g.pause = 0.6 + Math.random(); return; }
      }
    }
    const target = g.path[g.pathIdx];
    const dx = target.x - g.x, dy = target.y - g.y;
    const d = Math.hypot(dx, dy);
    const step = WALK_SPEED * dt;          // same serene pace for every wisp
    if (d <= step) {
      this.moveTo(g, target.x, target.y);
      if (++g.pathIdx >= g.path.length) {
        g.path = null;
        if (g.atExhibit < 0 && g.targetSpot >= 0) {
          // arrived at a fresh exhibit → settle in and loiter around it for a while
          g.visited.add(g.targetSpot);       // seen it; targetSpot stays set so others keep avoiding it
          g.atExhibit = g.targetSpot;
          g.loiterTime = LOITER_MIN + Math.random() * (LOITER_MAX - LOITER_MIN);
        }
        g.pause = (VIEW_MIN + Math.random() * (VIEW_MAX - VIEW_MIN)) * g.lingerScale;  // view from this spot
      }
    } else {
      // Aim a little to the side of the straight line and let that offset weave back and forth — the
      // wisp serpentines toward the waypoint instead of b-lining. The offset tapers near the target so
      // it still lands cleanly. moveTo keeps the weave from pushing it into a wall.
      const ux = dx / d, uy = dy / d;
      const weave = Math.sin(g.phase * g.weaveRate) * WEAVE_AMP * Math.min(1, d / (TILE_SIZE * 2.5));
      const aimx = target.x - uy * weave, aimy = target.y + ux * weave;
      const adx = aimx - g.x, ady = aimy - g.y, ad = Math.hypot(adx, ady) || 1;
      this.moveTo(g, g.x + (adx / ad) * step, g.y + (ady / ad) * step);
    }
  }

  // Drift to another in-range tile of the exhibit being loitered around — a short, irregular hop, so
  // the wisp mills about and views the exhibit from different spots like a guest, not a straight march.
  private hopWithinExhibit(g: Ghost) {
    const e = EXHIBITS[g.atExhibit];
    if (!e || e.tiles.length < 2) { g.path = null; return; }
    const sc = Math.floor(g.x / TILE_SIZE), sr = Math.floor(g.y / TILE_SIZE);
    for (const spot of shuffle(e.tiles).slice(0, 5)) {
      if (spot.col === sc && spot.row === sr) continue;
      const raw = findPath({ col: sc, row: sr }, spot);
      if (raw && raw.length >= 1) {
        const sm = raw.length > 1 ? smoothPath({ col: sc, row: sr }, raw) : raw;
        g.path = sm.map((c) => ({ x: (c.col + 0.5) * TILE_SIZE, y: (c.row + 0.5) * TILE_SIZE }));
        g.pathIdx = 0;
        return;
      }
    }
    g.path = null;
  }

  // Pick the next exhibit to check out: a not-yet-seen one, chosen uniformly at random across the
  // *whole* museum (not the nearest cluster) and skipping any exhibit another wisp is already heading
  // to or lingering at — so the wisps scatter to different wings instead of all crowding one branch or
  // exhibit. Route to a random tile within its interaction range (not the pedestal front). Once a wisp
  // has seen everything its tour resets.
  private pickVisit(g: Ghost) {
    const sc = Math.floor(g.x / TILE_SIZE), sr = Math.floor(g.y / TILE_SIZE);
    const taken = new Set<number>();          // exhibits other wisps are heading to / lingering at
    const takenBranches = new Set<number>();  // …and the wings those exhibits live in
    for (const o of this.ghosts) if (o !== g && o.targetSpot >= 0) {
      taken.add(o.targetSpot);
      takenBranches.add(EXHIBITS[o.targetSpot].branch);
    }
    const all = EXHIBITS.map((e, i) => ({ e, i }));
    // Strongest preference: an unseen exhibit in a wing no other wisp is in (spreads them across
    // branches). Then relax to any unseen+untaken, then any unseen, resetting the tour if needed.
    let pool = all.filter(({ e, i }) => !g.visited.has(i) && !taken.has(i) && !takenBranches.has(e.branch));
    if (!pool.length) pool = all.filter(({ i }) => !g.visited.has(i) && !taken.has(i));
    if (!pool.length) pool = all.filter(({ i }) => !g.visited.has(i));
    if (!pool.length) { g.visited.clear(); pool = all.filter(({ i }) => !taken.has(i)); }
    if (!pool.length) pool = all;
    for (const cand of shuffle(pool)) {
      for (const spot of shuffle(cand.e.tiles).slice(0, 4)) {     // a random in-range viewing tile
        if (spot.col === sc && spot.row === sr) continue;
        const raw = findPath({ col: sc, row: sr }, spot);
        if (raw && raw.length > 1) {
          const sm = smoothPath({ col: sc, row: sr }, raw);
          g.path = sm.map((c) => ({ x: (c.col + 0.5) * TILE_SIZE, y: (c.row + 0.5) * TILE_SIZE }));
          g.pathIdx = 0;                   // start at 0; a coincident first point is snapped through
          g.targetSpot = cand.i;
          return;
        }
      }
    }
    g.path = null;
  }

  // Move toward (nx, ny) but never let the wisp's body enter a wall — slide along it instead, keeping
  // a little clearance. Per-frame steps are small, so checking the destination box is enough; this is
  // what stops replay's straight lerps (between sparsely sampled points) from cutting wall corners.
  private moveTo(g: Ghost, nx: number, ny: number) {
    const H = GHOST_HALF;
    const free = (x: number, y: number) =>
      !isSolid(Math.floor((x - H) / TILE_SIZE), Math.floor((y - H) / TILE_SIZE)) &&
      !isSolid(Math.floor((x + H) / TILE_SIZE), Math.floor((y - H) / TILE_SIZE)) &&
      !isSolid(Math.floor((x - H) / TILE_SIZE), Math.floor((y + H) / TILE_SIZE)) &&
      !isSolid(Math.floor((x + H) / TILE_SIZE), Math.floor((y + H) / TILE_SIZE));
    if (free(nx, ny)) { g.x = nx; g.y = ny; }
    else if (free(nx, g.y)) g.x = nx;       // slide along X
    else if (free(g.x, ny)) g.y = ny;       // slide along Y
  }

  private static LIFT = TILE_SIZE * 0.42;   // float the wisp above the floor

  /** Draw every wisp whose ground tile sits on `sortRow`. Called once per sort row by the scene's
   *  y-sort (via the engine's entity hook) so walls drawn further south occlude the wisp's lower
   *  half naturally — the same depth layering the player and the duck get. */
  renderRow(ctx: CanvasRenderingContext2D, sortRow: number, camX: number, camY: number) {
    for (const g of this.ghosts) {
      if (Math.floor(g.y / TILE_SIZE) === sortRow) this.drawWisp(ctx, g, camX, camY);
    }
  }

  /** After the scene is drawn: where a wall covers a wisp, lay a faint cool silhouette over the top
   *  so the ghost still reads *through* the wall — mirrors the player's behind-wall glow. */
  renderOccludedHints(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    for (const g of this.ghosts) {
      if (g.occlAlpha > 0.01) this.drawHint(ctx, g, camX, camY);   // eased in/out (see update)
    }
  }

  private drawWisp(ctx: CanvasRenderingContext2D, g: Ghost, camX: number, camY: number) {
    const a = g.alpha;
    const lift = GhostSystem.LIFT;
    const sx = g.x + g.hx - camX;                                  // hovered body position
    const cy = g.y + g.hy - lift - camY;
    const breath = 0.5 + 0.5 * Math.sin(g.phase * g.breathRate);   // slow "alive" pulse 0..1

    ctx.save();
    ctx.globalCompositeOperation = "lighter";   // the whole wisp is additive light

    // 1) tail — the dense stream of soft sparks shed as the wisp drifts (built in update). Wide at the
    //    body, converging to a point: a long teardrop made entirely of particles.
    for (const s of g.tail) {
      const t01 = s.life / s.max;                          // 1 fresh → 0 gone
      blob(ctx, s.x - camX, s.y - camY - lift, s.size * (0.5 + 0.5 * t01), 0.5 * t01 * a, g.tint);
    }

    // 2) candlelight — a soft central glow blended into the swarm (not a hard disc), so the motes read
    //    as one warm light.
    blob(ctx, sx, cy, TILE_SIZE * (0.25 + 0.04 * breath), (0.15 + 0.05 * breath) * a, g.tint);

    // 3) body — a lively cluster of motes, radii weighted toward the centre so it's brightest there.
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const f = (i * 0.61803) % 1;                          // stable per-mote 0..1
      const baseR = TILE_SIZE * 0.24 * f * f;               // weighted toward the centre
      const wob = 1 + 0.25 * Math.sin(g.phase * 1.6 + i);
      const ang = g.phase * (0.45 + 0.35 * ((i * 0.37) % 1)) + i * 2.3995;
      const rad = baseR * wob;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(g.phase * 1.1 + i * 1.7));
      const size = 1.8 + 2.0 * ((i * 0.91) % 1);
      blob(ctx, sx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.8 - rad * 0.1, size, 0.5 * twinkle * a, g.tint);
    }
    ctx.restore();
  }

  private drawHint(ctx: CanvasRenderingContext2D, g: Ghost, camX: number, camY: number) {
    const a = g.alpha * 0.55 * g.occlAlpha;   // eased so the outline fades in/out, never pops
    const [tr, tg, tb] = g.tint;
    const sx = g.x + g.hx - camX;
    const cy = g.y + g.hy - GhostSystem.LIFT - camY;
    ctx.save();
    // a soft glow so the wisp's presence bleeds faintly through the wall …
    ctx.globalCompositeOperation = "lighter";
    blob(ctx, sx, cy, TILE_SIZE * 0.34, 0.18 * a, g.tint);
    // … plus a thin outline ring — the faint silhouette
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(sx, cy, TILE_SIZE * 0.19, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(${tr},${tg},${tb},${0.5 * a})`;
    ctx.stroke();
    ctx.restore();
  }
}
