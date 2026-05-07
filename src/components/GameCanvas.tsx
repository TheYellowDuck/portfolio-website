"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { GameEngine, GameEvent } from "@/game/engine";
import { Exhibit, ExhibitPopup } from "@/data/projects";
import { Howl } from "howler";
import DialogBox from "./DialogBox";
import ExhibitOverlay from "./ExhibitOverlay";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<ExhibitPopup | null>(null);

  const handleClose = useCallback(() => {
    setActivePopup(null);
    engineRef.current?.setPaused(false);
  }, []);

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activePopup) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activePopup, handleClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    engine.onEvent = (event: GameEvent) => {
      switch (event.type) {
        case "nearby":
          setPrompt("Press E to inspect");
          break;

        case "leave":
          setPrompt(null);
          break;

        case "interact": {
          const exhibit = event.content;

          // Play audio if present
          if (exhibit.audio) {
            new Howl({ src: [exhibit.audio] }).play();
          }

          // Show popup if present, otherwise just the audio plays
          if (exhibit.popup) {
            setActivePopup(exhibit.popup);
            setPrompt(null);
            engine.setPaused(true);
          }
          break;
        }
      }
    };

    engine.start();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      engine.stop();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ display: "block", imageRendering: "pixelated" }}
      />
      <DialogBox message={prompt || ""} visible={!!prompt && !activePopup} />
      <ExhibitOverlay popup={activePopup} onClose={handleClose} />
    </>
  );
}