"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { GameEngine, GameEvent } from "@/game/engine";
import { Exhibit, ExhibitPopup } from "@/data/projects";
import { Howl, Howler } from "howler";
import ControlsHint from "./ControlsHint";
import DialogBox from "./DialogBox";
import ExhibitOverlay from "./ExhibitOverlay.tailwind";
import LoadingScreen from "./LoadingScreen";
import Minimap from "./Minimap";

const BG_MUSIC_SRCS = [
  "/assets/audio/Interior Birdecorator Explore_CUTE.m4a",
  "/assets/audio/Interior Birdecorator Explore_CUTE.ogg",
];

// SSR/pre-mount fallback — overwritten at mount with the actual window size.
const BASE_W = 1920;
const BASE_H = 1080;

export default function GameCanvas() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const engineRef    = useRef<GameEngine | null>(null);
  const howlCache    = useRef<Map<string, Howl>>(new Map());
  const footstepHowls = useRef<Howl[]>([]);
  const scaleRef     = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const safeFrameRef = useRef<HTMLDivElement>(null);
  // Grow-only base size: starts at mount's window size, never shrinks.
  const baseSizeRef  = useRef({ w: BASE_W, h: BASE_H });

  const minimapDrawRef  = useRef<((x: number, y: number) => void) | null>(null);
  const bgMusicRef      = useRef<Howl | null>(null);
  const musicStartedRef = useRef(false);
  const [isBgmMuted, setIsBgmMuted] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  const sfxMutedRef = useRef(false);
  const [musicStarted, setMusicStarted] = useState(false);

  // Layout is driven by direct DOM mutation — no setState means no cascading renders.
  const updateLayout = useCallback(() => {
    const { w: bw, h: bh } = baseSizeRef.current;

    // Grow the base if the window expanded beyond the initial size.
    const newW = Math.max(bw, window.innerWidth);
    const newH = Math.max(bh, window.innerHeight);
    if (newW !== bw || newH !== bh) {
      baseSizeRef.current = { w: newW, h: newH };
      if (containerRef.current) {
        containerRef.current.style.width      = `${newW}px`;
        containerRef.current.style.height     = `${newH}px`;
        containerRef.current.style.marginLeft = `${-newW / 2}px`;
        containerRef.current.style.marginTop  = `${-newH / 2}px`;
      }
      if (canvasRef.current) {
        canvasRef.current.width  = newW;
        canvasRef.current.height = newH;
      }
      engineRef.current?.resize(newW, newH);
    }

    const { w, h } = baseSizeRef.current;
    const s = Math.max(window.innerWidth / w, window.innerHeight / h);
    scaleRef.current = s;
    const cx = Math.max(0, (w - window.innerWidth  / s) / 2);
    const cy = Math.max(0, (h - window.innerHeight / s) / 2);
    if (containerRef.current) {
      containerRef.current.style.transform = `scale(${s})`;
    }
    if (safeFrameRef.current) {
      safeFrameRef.current.style.top    = `${cy + 8}px`;
      safeFrameRef.current.style.right  = `${cx + 8}px`;
      safeFrameRef.current.style.bottom = `${cy + 8}px`;
      safeFrameRef.current.style.left   = `${cx + 8}px`;
    }
  }, []);

  // Runs before first paint — use screen dimensions as the fixed base so full-window
  // users always get scale≈1 and small windows proportionally scale down.
  useLayoutEffect(() => {
    const bw = window.screen.width;
    const bh = window.screen.height;
    baseSizeRef.current = { w: bw, h: bh };
    if (containerRef.current) {
      containerRef.current.style.width      = `${bw}px`;
      containerRef.current.style.height     = `${bh}px`;
      containerRef.current.style.marginLeft = `${-bw / 2}px`;
      containerRef.current.style.marginTop  = `${-bh / 2}px`;
    }
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [updateLayout]);

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
    setIsBgmMuted(prev => {
      const next = !prev;
      if (bgMusicRef.current) bgMusicRef.current.mute(next);
      return next;
    });
  }, []);

  const toggleSfxMute = useCallback(() => {
    setIsSfxMuted(prev => {
      const next = !prev;
      sfxMutedRef.current = next;
      howlCache.current.forEach(h => h.mute(next));
      footstepHowls.current.forEach(h => h.mute(next));
      return next;
    });
  }, []);

  const [isLoading, setIsLoading]       = useState(true);
  const [prompt, setPrompt]             = useState<string | null>(null);
  const [activePopup, setActivePopup]   = useState<ExhibitPopup | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [bigMap, setBigMap]             = useState(false);

  useEffect(() => {
    const resume = () => {
      if (Howler.ctx?.state === "suspended") Howler.ctx.resume();
      if (musicStartedRef.current && bgMusicRef.current && !bgMusicRef.current.playing()) {
        bgMusicRef.current.play();
      }
    };
    const onVisibility = () => { if (document.visibilityState === "visible") resume(); };
    document.addEventListener("visibilitychange", onVisibility);
    const heartbeat = setInterval(resume, 4000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(heartbeat);
    };
  }, []);

  const handleClose = useCallback(() => {
    setActivePopup(null);
    engineRef.current?.setPaused(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      startBgMusic();
      if (e.key === "`" && activePopup) handleClose();
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
      if (e.key === "m" || e.key === "M") setBigMap(prev => !prev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activePopup, handleClose, startBgMusic]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width  = baseSizeRef.current.w;
    canvas.height = baseSizeRef.current.h;

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
        case "nearby":  setPrompt("Press E to inspect"); break;
        case "leave":   setPrompt(null); break;
        case "idle":    setShowControls(true); break;
        case "active":  setShowControls(false); break;
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
    let timerReady   = false;
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

    return () => engine.stop();
  }, []);

  return (
    // Outer: fills viewport, clips edges that zoom-fill pushes past screen boundary.
    <div className="fixed inset-0 overflow-hidden bg-[#1c1508]">
      {/* Inner: fixed reference resolution. Centered via absolute+negative-margin (reliable
          cross-browser vs flex). Transform and safe-frame insets written by updateLayout. */}
      <div
        ref={containerRef}
        className="absolute overflow-hidden origin-center"
        style={{ top: "50%", left: "50%" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block [image-rendering:pixelated]"
          onClick={e => {
            startBgMusic();
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            engineRef.current?.clickAt(
              (e.clientX - rect.left) / scaleRef.current,
              (e.clientY - rect.top)  / scaleRef.current,
            );
          }}
        />

        {/* Full-screen overlays sit outside the safe frame so they cover the whole canvas. */}
        <ExhibitOverlay popup={activePopup} onClose={handleClose} />
        <LoadingScreen visible={isLoading} />

        {/* Safe frame: inset written by updateLayout before first paint. */}
        <div
          ref={safeFrameRef}
          className="absolute pointer-events-none"
        >
          <ControlsHint visible={showControls && !isLoading && !activePopup} />
          <DialogBox message={prompt || ""} visible={!!prompt && !activePopup && !showControls} />
          <Minimap
            onRegisterDraw={handleRegisterMinimapDraw}
            bigMap={bigMap}
            onOpenBigMap={() => setBigMap(true)}
            onCloseBigMap={() => setBigMap(false)}
          />
          {musicStarted && (
            <div className="absolute bottom-8 left-8 z-20 flex gap-2" style={{ pointerEvents: "auto" }}>
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
        </div>
      </div>
    </div>
  );
}
