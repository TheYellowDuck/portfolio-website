"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { GameEngine, GameEvent } from "@/game/engine";
import { Exhibit, ExhibitPopup, resumeExhibit } from "@/data/projects";
import { Howl } from "howler";
import DialogBox from "./DialogBox";
import ExhibitOverlay from "./ExhibitOverlay";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const howlCache = useRef<Map<string, Howl>>(new Map());

  const [prompt, setPrompt] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<ExhibitPopup | null>(resumeExhibit[0].popup ?? null);

  const handleClose = useCallback(() => {
    setActivePopup(null);
    engineRef.current?.setPaused(false);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "`" && activePopup) handleClose();
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
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
          const exhibit: Exhibit = event.content;

          if (exhibit.audio) {
            let howl = howlCache.current.get(exhibit.audio);
            if (!howl) {
              howl = new Howl({ src: [exhibit.audio] });
              howlCache.current.set(exhibit.audio, howl);
            }
            howl.play();
          }

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
    engine.setPaused(true);

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
        className="block [image-rendering:pixelated]"
      />
      <DialogBox message={prompt || ""} visible={!!prompt && !activePopup} />
      <ExhibitOverlay popup={activePopup} onClose={handleClose} />
    </>
  );
}
