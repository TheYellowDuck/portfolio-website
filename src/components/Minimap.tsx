"use client";

import { useEffect, useRef } from "react";
import {
  museumMap,
  TILES,
  TILE_SIZE,
  INTERACTABLE_TILES,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
  NPC_COL,
  NPC_ROW,
  branchLabels,
} from "@/game/tilemap";

const SCALE = 6;
const MAP_COLS = museumMap[0].length;
const MAP_ROWS = museumMap.length;
const FULL_W = MAP_COLS * SCALE;
const FULL_H = MAP_ROWS * SCALE;
const W = FULL_W;
const H = Math.round(W / 1.618);   // golden-ratio landscape crop
const BIG_PAD = 48;                 // padding so edge labels aren't clipped
const BIG_W = FULL_W + 2 * BIG_PAD;
const BIG_H = FULL_H + 2 * BIG_PAD;

interface MinimapProps {
  onRegisterDraw: (fn: (x: number, y: number) => void) => void;
  bigMap: boolean;
  onOpenBigMap: () => void;
  onCloseBigMap: () => void;
}

export default function Minimap({ onRegisterDraw, bigMap, onOpenBigMap, onCloseBigMap }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bigCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastPosRef = useRef({ x: PLAYER_SPAWN_COL * TILE_SIZE, y: PLAYER_SPAWN_ROW * TILE_SIZE });
  const bigMapRef = useRef(bigMap);
  const drawBigRef = useRef<((x: number, y: number) => void) | null>(null);

  bigMapRef.current = bigMap;

  useEffect(() => {
    const canvas = canvasRef.current;
    const bigCanvas = bigCanvasRef.current;
    if (!canvas || !bigCanvas) return;

    const ctx = canvas.getContext("2d")!;
    const bigCtx = bigCanvas.getContext("2d")!;

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

    const drawSmall = (playerX: number, playerY: number) => {
      const pxFull = (playerX / TILE_SIZE + 0.5) * SCALE;
      const pyFull = (playerY / TILE_SIZE + 0.5) * SCALE;
      const cropX = pxFull - W / 2;
      const cropY = pyFull - H / 2;

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

      const meLx = (NPC_COL + 0.5) * SCALE - cropX;
      const meLy = (NPC_ROW + 0.5) * SCALE - cropY;
      if (meLx >= -30 && meLx <= W + 30 && meLy >= -20 && meLy <= H + 20) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `500 9px "Century Gothic", "Futura", "Trebuchet MS", sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.95)";
        ctx.shadowBlur = 6;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText("ME", meLx, meLy);
        ctx.restore();
      }

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

    const drawBig = (playerX: number, playerY: number) => {
      bigCtx.clearRect(0, 0, BIG_W, BIG_H);
      bigCtx.save();
      bigCtx.translate(BIG_PAD, BIG_PAD);
      bigCtx.drawImage(bg, 0, 0);

      const playerCol = Math.floor(playerX / TILE_SIZE);
      const playerRow = Math.floor(playerY / TILE_SIZE);
      const activeBranch = branchLabels.find(bl =>
        playerRow >= bl.rowMin && playerRow <= bl.rowMax &&
        playerCol >= bl.colMin && playerCol <= bl.colMax
      );

      bigCtx.save();
      bigCtx.textAlign = "center";
      bigCtx.textBaseline = "middle";
      for (const bl of branchLabels) {
        const lx = (bl.col + 0.5) * SCALE;
        const ly = (bl.row + 0.5) * SCALE;
        const isActive = activeBranch === bl;
        bigCtx.font = `500 ${isActive ? 14 : 11}px "Century Gothic", "Futura", "Trebuchet MS", sans-serif`;
        bigCtx.shadowColor = "rgba(0,0,0,0.95)";
        bigCtx.shadowBlur = 8;
        bigCtx.shadowOffsetX = 0;
        bigCtx.shadowOffsetY = 0;
        bigCtx.fillStyle = isActive ? "#f0d98a" : "rgba(200,178,130,0.8)";
        bigCtx.fillText(bl.label.toUpperCase(), lx, ly);
        bigCtx.shadowBlur = 0;
      }
      bigCtx.restore();

      bigCtx.save();
      bigCtx.textAlign = "center";
      bigCtx.textBaseline = "middle";
      bigCtx.font = `500 11px "Century Gothic", "Futura", "Trebuchet MS", sans-serif`;
      bigCtx.shadowColor = "rgba(0,0,0,0.95)";
      bigCtx.shadowBlur = 8;
      bigCtx.fillStyle = "rgba(255,255,255,0.9)";
      bigCtx.fillText("ME", (NPC_COL + 0.5) * SCALE, (NPC_ROW + 0.5) * SCALE);
      bigCtx.restore();

      const px = (playerX / TILE_SIZE + 0.5) * SCALE;
      const py = (playerY / TILE_SIZE + 0.5) * SCALE;
      const dotR = SCALE * 1.5;

      bigCtx.beginPath();
      bigCtx.arc(px, py, dotR, 0, Math.PI * 2);
      bigCtx.fillStyle = "rgba(255,255,255,0.9)";
      bigCtx.fill();

      bigCtx.beginPath();
      bigCtx.arc(px, py, dotR * 0.55, 0, Math.PI * 2);
      bigCtx.fillStyle = "#7a9e7e";
      bigCtx.fill();

      bigCtx.restore();
    };

    drawBigRef.current = drawBig;

    const draw = (playerX: number, playerY: number) => {
      lastPosRef.current = { x: playerX, y: playerY };
      drawSmall(playerX, playerY);
      if (bigMapRef.current) drawBig(playerX, playerY);
    };

    onRegisterDraw(draw);
    draw(PLAYER_SPAWN_COL * TILE_SIZE, PLAYER_SPAWN_ROW * TILE_SIZE);
  }, [onRegisterDraw]);

  // Draw big canvas immediately when overlay opens (engine may not fire a position update soon).
  useEffect(() => {
    if (bigMap && drawBigRef.current) {
      drawBigRef.current(lastPosRef.current.x, lastPosRef.current.y);
    }
  }, [bigMap]);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-10 flex flex-col items-end gap-1">
        <div
          className="overflow-hidden rounded-2xl border border-[rgba(122,158,126,0.4)] bg-[#1c1508] shadow-[0_4px_20px_rgba(28,21,8,0.4)] opacity-85 cursor-pointer"
          onClick={onOpenBigMap}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block [image-rendering:pixelated]"
          />
        </div>
        <p className="text-[rgba(200,178,130,0.4)] text-[10px] font-mono tracking-widest select-none pr-1">
          M TO EXPAND
        </p>
      </div>

      {/* Overlay is always in DOM so bigCanvasRef is set on mount. Visibility toggled via opacity. */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-150 ${bigMap ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onCloseBigMap}
      >
        <canvas
          ref={bigCanvasRef}
          width={BIG_W}
          height={BIG_H}
          className="block [image-rendering:pixelated]"
          style={{
            width: `min(48vw, calc(48vh * ${(BIG_W / BIG_H).toFixed(6)}))`,
            height: `min(48vh, calc(48vw * ${(BIG_H / BIG_W).toFixed(6)}))`,
          }}
          onClick={e => e.stopPropagation()}
        />
        <p className="mt-3 text-[rgba(200,178,130,0.45)] text-xs font-mono tracking-widest select-none">
          M · CLICK TO CLOSE
        </p>
      </div>
    </>
  );
}
