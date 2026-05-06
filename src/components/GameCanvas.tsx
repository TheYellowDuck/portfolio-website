"use client";

import { useRef, useEffect } from "react";
import { GameEngine } from "@/game/engine";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Create and start the engine
    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.start();

    // Clean up when component unmounts
    return () => {
      engine.stop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        margin: "0 auto",
        border: "2px solid #333",
        imageRendering: "pixelated", // This keeps pixel art crisp
      }}
    />
  );
}