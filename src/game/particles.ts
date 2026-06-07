// Particle system, extracted from engine.ts.
//
// Pure particle mechanics — spawning, integration, and drawing. The *timing*
// of spawns (footstep cadence, ambient dust rate, sparkle while near a
// pedestal) stays in the engine update loop, since it depends on game state.
//
// Three particle types share one pool and one y-sort field:
//   - dust:     ambient motes drifting upward across the viewport
//   - footstep: short puffs kicked up while walking, sorted to the player's row
//   - sparkle:  additive glints rising from a nearby pedestal

import { TILE_SIZE } from "./tilemap";

export interface Particle {
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

interface Rect { x: number; y: number; width: number; height: number; }

export class ParticleSystem {
  readonly particles: Particle[] = [];

  countDust(): number {
    let n = 0;
    for (const p of this.particles) if (p.type === 'dust') n++;
    return n;
  }

  spawnDustMote(camX: number, camY: number, viewW: number, viewH: number): void {
    const x = camX + Math.random() * viewW;
    const y = camY + Math.random() * viewH;
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

  spawnFootstepDust(player: Rect): void {
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

  spawnPedestalSparkle(pedestal: { row: number; col: number }, player: Rect): void {
    const { row, col } = pedestal;
    const pedestalCX = col * TILE_SIZE + TILE_SIZE / 2;
    const pedestalCY = row * TILE_SIZE + TILE_SIZE / 2;
    const playerCX = player.x + player.width / 2;
    const playerCY = player.y + player.height / 2;
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

  update(dt: number): void {
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

  draw(
    ctx: CanvasRenderingContext2D,
    camX: number, camY: number, viewW: number, viewH: number,
    layer: 'footstep' | 'sparkle' | 'dust',
    atSortRow?: number,
  ): void {
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
}
