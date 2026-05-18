"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { GameEngine, GameEvent } from "@/game/engine";
import { Exhibit, ExhibitPopup } from "@/data/projects";
import { Howl } from "howler";
import ControlsHint from "./ControlsHint";
import DialogBox from "./DialogBox";
import ExhibitOverlay from "./ExhibitOverlay";
import LoadingScreen from "./LoadingScreen";
import Minimap from "./Minimap";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const howlCache = useRef<Map<string, Howl>>(new Map());
  const minimapDrawRef = useRef<((x: number, y: number) => void) | null>(null);

  const handleRegisterMinimapDraw = useCallback((fn: (x: number, y: number) => void) => {
    minimapDrawRef.current = fn;
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<ExhibitPopup | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [bigMap, setBigMap] = useState(false);

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
      if (e.key === "m" || e.key === "M") setBigMap(prev => !prev);
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
    engine.debugPhysics = false;
    engineRef.current = engine;

    engine.onEvent = (event: GameEvent) => {
      switch (event.type) {
        case "nearby":
          setPrompt("Press E to inspect");
          break;

        case "leave":
          setPrompt(null);
          break;

        case "idle":
          setShowControls(true);
          break;

        case "active":
          setShowControls(false);
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
            setShowControls(false);
            engine.setPaused(true);
          }
          break;
        }
      }
    };

    let spritesReady = false;
    let timerReady = false;
    const tryHide = () => {
      if (spritesReady && timerReady) {
        setIsLoading(false);
        engineRef.current?.setPaused(false);
      }
    };
    engine.onReady = () => { spritesReady = true; tryHide(); };
    engine.onPositionChange = (x, y) => minimapDrawRef.current?.(x, y);
    setTimeout(() => { timerReady = true; tryHide(); }, 1500);
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
        onClick={e => {
          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
          engineRef.current?.clickAt(e.clientX - rect.left, e.clientY - rect.top);
        }}
      />
      <ControlsHint visible={showControls && !isLoading && !activePopup} />
      <DialogBox message={prompt || ""} visible={!!prompt && !activePopup && !showControls} />
      <ExhibitOverlay popup={activePopup} onClose={handleClose} />
      <Minimap onRegisterDraw={handleRegisterMinimapDraw} bigMap={bigMap} onOpenBigMap={() => setBigMap(true)} onCloseBigMap={() => setBigMap(false)} />
      <LoadingScreen visible={isLoading} />
    </>
  );
}
