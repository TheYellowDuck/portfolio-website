"use client";

import { useEffect, useRef } from "react";
import {
  museumMap,
  TILES,
  TILE_SIZE,
  INTERACTABLE_TILES,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
  branchLabels,
} from "@/game/tilemap";

const SCALE = 6;
const MAP_COLS = museumMap[0].length;
const MAP_ROWS = museumMap.length;
const FULL_W = MAP_COLS * SCALE;
const FULL_H = MAP_ROWS * SCALE;
const W = FULL_W;
const H = Math.round(W / 1.618);   // golden-ratio landscape crop

interface MinimapProps {
  onRegisterDraw: (fn: (x: number, y: number) => void) => void;
}

export default function Minimap({ onRegisterDraw }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Pre-render the static map onto an offscreen canvas once.
    const bg = document.createElement("canvas");
    bg.width = FULL_W;
    bg.height = FULL_H;
    const bgCtx = bg.getContext("2d")!;

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tile = museumMap[r][c];
        if (tile === TILES.VOID) continue;
        if (tile === TILES.WALL) {
          bgCtx.fillStyle = "#ddd0b3";
        } else if (INTERACTABLE_TILES.has(tile)) {
          bgCtx.fillStyle = "#8aae8e";
        } else {
          bgCtx.fillStyle = "#c9a87c";
        }
        bgCtx.fillRect(c * SCALE, r * SCALE, SCALE, SCALE);
      }
    }

    const draw = (playerX: number, playerY: number) => {
      const pxFull = (playerX / TILE_SIZE + 0.5) * SCALE;
      const pyFull = (playerY / TILE_SIZE + 0.5) * SCALE;
      const cropX = pxFull - W / 2;
      const cropY = pyFull - H / 2;

      // Draw bg map with player-centered crop (handles edges by leaving canvas transparent)
      ctx.clearRect(0, 0, W, H);
      const srcX = Math.max(0, cropX);
      const srcY = Math.max(0, cropY);
      const srcW = Math.min(W, FULL_W - srcX);
      const srcH = Math.min(H, FULL_H - srcY);
      const dstX = Math.max(0, -cropX);
      const dstY = Math.max(0, -cropY);
      if (srcW > 0 && srcH > 0) {
        ctx.drawImage(bg, srcX, srcY, srcW, srcH, dstX, dstY, srcW, srcH);
      }

      // Branch labels
      const playerCol = Math.floor(playerX / TILE_SIZE);
      const playerRow = Math.floor(playerY / TILE_SIZE);
      const activeBranch = branchLabels.find(bl =>
        playerRow >= bl.rowMin && playerRow <= bl.rowMax &&
        playerCol >= bl.colMin && playerCol <= bl.colMax
      );

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const bl of branchLabels) {
        const lx = (bl.col + 0.5) * SCALE - cropX;
        const ly = (bl.row + 0.5) * SCALE - cropY;
        if (lx < -60 || lx > W + 60 || ly < -30 || ly > H + 30) continue;

        const isActive = activeBranch === bl;
        ctx.font = `500 ${isActive ? 11 : 9}px "Century Gothic", "Futura", "Trebuchet MS", sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.95)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = isActive ? "#f0d98a" : "rgba(200,178,130,0.8)";
        ctx.fillText(bl.label.toUpperCase(), lx, ly);
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      const px = W / 2;
      const py = H / 2;
      const dotR = SCALE * 1.2;

      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, dotR * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = "#7a9e7e";
      ctx.fill();
    };

    onRegisterDraw(draw);
    draw(PLAYER_SPAWN_COL * TILE_SIZE, PLAYER_SPAWN_ROW * TILE_SIZE);
  }, [onRegisterDraw]);

  return (
    <div className="fixed bottom-4 right-4 z-10 overflow-hidden rounded-2xl border border-[rgba(122,158,126,0.4)] bg-[#1c1508] shadow-[0_4px_20px_rgba(28,21,8,0.4)] opacity-85">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block [image-rendering:pixelated]"
      />
    </div>
  );
}
