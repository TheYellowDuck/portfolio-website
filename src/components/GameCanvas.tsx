"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { GameEngine, GameEvent } from "@/game/engine";
import { Exhibit, ExhibitPopup } from "@/data/projects";
import { Howl, Howler } from "howler";
import ControlsHint from "./ControlsHint";
import DialogBox from "./DialogBox";
import ExhibitOverlay from "./ExhibitOverlay.tailwind";
import LoadingScreen from "./LoadingScreen";
import Minimap from "./Minimap";

// M4A listed first so Safari picks it (no OGG support); Chrome/Firefox fall through to OGG.
const BG_MUSIC_SRCS = [
  "/assets/audio/Interior Birdecorator Explore_CUTE.m4a",
  "/assets/audio/Interior Birdecorator Explore_CUTE.ogg",
];

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const howlCache = useRef<Map<string, Howl>>(new Map());
  const footstepHowls = useRef<Howl[]>([]);

  const minimapDrawRef = useRef<((x: number, y: number) => void) | null>(null);
  const bgMusicRef = useRef<Howl | null>(null);
  const musicStartedRef = useRef(false);
  const [isBgmMuted, setIsBgmMuted] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  const sfxMutedRef = useRef(false);
  const [musicStarted, setMusicStarted] = useState(false);

  const handleRegisterMinimapDraw = useCallback((fn: (x: number, y: number) => void) => {
    minimapDrawRef.current = fn;
  }, []);

  const startBgMusic = useCallback(() => {
    if (musicStartedRef.current) return;
    musicStartedRef.current = true;
    setMusicStarted(true);
    const howl = new Howl({ src: BG_MUSIC_SRCS, loop: true, volume: 0.1 });
    bgMusicRef.current = howl;
    howl.play();
  }, []);

  const toggleBgmMute = useCallback(() => {
    setIsBgmMuted((prev: boolean) => {
      const next = !prev;
      if (bgMusicRef.current) bgMusicRef.current.mute(next);
      return next;
    });
  }, []);

  const toggleSfxMute = useCallback(() => {
    setIsSfxMuted((prev: boolean) => {
      const next = !prev;
      sfxMutedRef.current = next;
      howlCache.current.forEach(h => h.mute(next));
      footstepHowls.current.forEach(h => h.mute(next));
      return next;
    });
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<ExhibitPopup | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [bigMap, setBigMap] = useState(false);

  useEffect(() => {
    const resume = () => {
      if (Howler.ctx?.state === "suspended") Howler.ctx.resume();
      if (musicStartedRef.current && bgMusicRef.current && !bgMusicRef.current.playing()) {
        bgMusicRef.current.play();
      }
    };
    const handleVisibility = () => { if (document.visibilityState === "visible") resume(); };
    document.addEventListener("visibilitychange", handleVisibility);
    const heartbeat = setInterval(resume, 4000);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(heartbeat);
    };
  }, []);

  const handleClose = useCallback(() => {
    setActivePopup(null);
    engineRef.current?.setPaused(false);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      startBgMusic();
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
  }, [activePopup, handleClose, startBgMusic]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas);
    engine.debugPhysics = false;
    engineRef.current = engine;

    engine.onFootstep = () => {
      if (!footstepHowls.current.length) {
        const h = new Howl({ src: ["/assets/audio/footstep.wav"], volume: 0.15 });
        h.mute(sfxMutedRef.current);
        footstepHowls.current = [h];
      }
      footstepHowls.current[0].play();
    };

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

          {
            let howl = howlCache.current.get("__interact__");
            if (!howl) {
              howl = new Howl({ src: ["/assets/audio/interact.wav"], volume: 0.05 });
              howl.mute(sfxMutedRef.current);
              howlCache.current.set("__interact__", howl);
            }
            howl.play();
          }

          if (exhibit.audio) {
            let howl = howlCache.current.get(exhibit.audio);
            if (!howl) {
              howl = new Howl({ src: [exhibit.audio] });
              howl.mute(sfxMutedRef.current);
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
          startBgMusic();
          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
          engineRef.current?.clickAt(e.clientX - rect.left, e.clientY - rect.top);
        }}
      />
      <ControlsHint visible={showControls && !isLoading && !activePopup} />
      <DialogBox message={prompt || ""} visible={!!prompt && !activePopup && !showControls} />
      <ExhibitOverlay popup={activePopup} onClose={handleClose} />
      <Minimap onRegisterDraw={handleRegisterMinimapDraw} bigMap={bigMap} onOpenBigMap={() => setBigMap(true)} onCloseBigMap={() => setBigMap(false)} />
      <LoadingScreen visible={isLoading} />
      {musicStarted && (
        <div className="fixed bottom-8 left-8 z-20 flex gap-2">
          <button
            onClick={toggleBgmMute}
            className="rounded-2xl border border-[rgba(122,158,126,0.7)] bg-[rgba(254,249,236,0.95)] px-3 py-1.5 font-mono text-[13px] text-walnut shadow-[0_4px_20px_rgba(28,21,8,0.2)] hover:bg-[rgba(234,229,216,0.95)] transition-colors"
            title={isBgmMuted ? "Unmute music" : "Mute music"}
          >
            {isBgmMuted ? "♪ off" : "♪ on"}
          </button>
          <button
            onClick={toggleSfxMute}
            className="rounded-2xl border border-[rgba(122,158,126,0.7)] bg-[rgba(254,249,236,0.95)] px-3 py-1.5 font-mono text-[13px] text-walnut shadow-[0_4px_20px_rgba(28,21,8,0.2)] hover:bg-[rgba(234,229,216,0.95)] transition-colors"
            title={isSfxMuted ? "Unmute effects" : "Mute effects"}
          >
            {isSfxMuted ? "sfx off" : "sfx on"}
          </button>
        </div>
      )}
    </>
  );
}
