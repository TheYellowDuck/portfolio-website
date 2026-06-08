"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { GameEngine, GameEvent } from "@/game/engine";
import { TILE_SIZE } from "@/game/tilemap";
import { Exhibit, ExhibitPopup } from "@/data/projects";
import { Howl, Howler } from "howler";
import ControlsHint from "./ControlsHint";
import DialogBox from "./DialogBox";
import ExhibitOverlay from "./overlays/ExhibitOverlay";
import LoadingScreen from "./LoadingScreen";
import Minimap from "./Minimap";
import TouchControls from "./TouchControls";

const BG_MUSIC_SRCS = [
  "/assets/audio/Interior Birdecorator Explore_CUTE.m4a",
  "/assets/audio/Interior Birdecorator Explore_CUTE.ogg",
];

// SSR/pre-mount fallback — overwritten at mount with the actual viewport size.
const BASE_W = 1920;
const BASE_H = 1080;

// World zoom: the engine renders at a fixed TILE_SIZE px/tile, then the canvas is
// CSS-scaled by `s`. On-screen px/tile = TILE_SIZE * s. We never zoom past native
// (s ≤ 1) but zoom out enough that the SHORTER viewport side always shows at least
// this many tiles — so a phone isn't over-zoomed in either orientation.
const MIN_TILES_SHORT = 10;

export default function GameCanvas() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const engineRef    = useRef<GameEngine | null>(null);
  const howlCache    = useRef<Map<string, Howl>>(new Map());
  const footstepHowls = useRef<Howl[]>([]);
  const scaleRef     = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);
  // Render base size — recomputed from the viewport on every layout.
  const baseSizeRef  = useRef({ w: BASE_W, h: BASE_H });

  const minimapDrawRef  = useRef<((x: number, y: number) => void) | null>(null);
  const bgMusicRef      = useRef<Howl | null>(null);
  const musicStartedRef = useRef(false);
  const [isBgmMuted, setIsBgmMuted] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  const sfxMutedRef = useRef(false);
  const [musicStarted, setMusicStarted] = useState(false);

  // Layout is driven by direct DOM mutation — no setState means no cascading renders.
  // Compute zoom + render base from the current viewport: cap on-screen zoom at
  // native (s ≤ 1) but zoom out so the shorter side shows ≥ MIN_TILES_SHORT tiles.
  // The base canvas is sized to exactly cover the viewport at scale s (no letterbox).
  const updateLayout = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tilePx = Math.min(TILE_SIZE, Math.min(vw, vh) / MIN_TILES_SHORT);
    const s = tilePx / TILE_SIZE;
    const bw = Math.ceil(vw / s);
    const bh = Math.ceil(vh / s);

    scaleRef.current = s;
    const { w, h } = baseSizeRef.current;
    if (bw !== w || bh !== h) {
      baseSizeRef.current = { w: bw, h: bh };
      if (containerRef.current) {
        containerRef.current.style.width      = `${bw}px`;
        containerRef.current.style.height     = `${bh}px`;
        containerRef.current.style.marginLeft = `${-bw / 2}px`;
        containerRef.current.style.marginTop  = `${-bh / 2}px`;
      }
      if (canvasRef.current) {
        canvasRef.current.width  = bw;
        canvasRef.current.height = bh;
      }
      engineRef.current?.resize(bw, bh);
    }
    if (containerRef.current) {
      containerRef.current.style.transform = `scale(${s})`;
    }
  }, []);

  // Runs before first paint, then on every resize / orientation change.
  useLayoutEffect(() => {
    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.addEventListener("orientationchange", updateLayout);
    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("orientationchange", updateLayout);
    };
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
  const [progress, setProgress]         = useState({ loaded: 0, total: 0 });
  const [prompt, setPrompt]             = useState<string | null>(null);
  const [activePopup, setActivePopup]   = useState<ExhibitPopup | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [bigMap, setBigMap]             = useState(false);
  const [isTouch, setIsTouch]           = useState(false);

  // Coarse pointer → show on-screen touch controls (also true in mobile emulation).
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Touch users may never fire a key or canvas click — start music on first touch.
  useEffect(() => {
    const onFirstPointer = () => startBgMusic();
    window.addEventListener("pointerdown", onFirstPointer, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstPointer);
  }, [startBgMusic]);

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

    setProgress({ loaded: 0, total: engine.spritesTotal });
    engine.onProgress = (loaded, total) => setProgress({ loaded, total });
    // Lift the loading screen once every tracked sprite has resolved (load OR
    // error, so it can't hang). The visitor can also tap "Enter" to start early.
    engine.onReady = () => {
      setIsLoading(false);
      engine.setPaused(false);
    };
    engine.onPositionChange = (x, y) => minimapDrawRef.current?.(x, y);
    engine.start();
    engine.setPaused(true);

    return () => engine.stop();
  }, []);

  return (
    // Outer: fills viewport, clips edges that zoom-fill pushes past screen boundary.
    <div className="fixed inset-0 overflow-hidden bg-[#1c1508]">
      {/* Scaled world: base canvas centered via absolute+negative-margin, CSS-scaled
          by updateLayout. Only the canvas lives here so the HUD never scales with zoom. */}
      <div
        ref={containerRef}
        className="absolute overflow-hidden origin-center"
        style={{ top: "50%", left: "50%" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block [image-rendering:pixelated] touch-none"
          onClick={e => {
            startBgMusic();
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            engineRef.current?.clickAt(
              (e.clientX - rect.left) / scaleRef.current,
              (e.clientY - rect.top)  / scaleRef.current,
            );
          }}
        />
      </div>

      <LoadingScreen
        visible={isLoading}
        loaded={progress.loaded}
        total={progress.total}
      />

      {/* HUD chrome — real viewport coordinates, never scaled with the world zoom. */}
      <div className="fixed inset-2 z-10 pointer-events-none">
        <ControlsHint
          visible={showControls && !isLoading && !activePopup}
          isTouch={isTouch}
          message={isTouch ? "Drag to move · push to run · tap E to inspect" : undefined}
        />
        {/* On touch the glowing E button already signals "inspect", so the bottom
            prompt is hidden to keep the thumb zone clear. */}
        <DialogBox message={prompt || ""} visible={!!prompt && !activePopup && !showControls && !isTouch} />
        <Minimap
          onRegisterDraw={handleRegisterMinimapDraw}
          bigMap={bigMap}
          isTouch={isTouch}
          onOpenBigMap={() => setBigMap(true)}
          onCloseBigMap={() => setBigMap(false)}
        />
        {musicStarted && (
          <div
            className="absolute z-20 flex gap-2"
            style={{
              pointerEvents: "auto",
              ...(isTouch
                ? { top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: "calc(env(safe-area-inset-left, 0px) + 12px)" }
                : { bottom: "2rem", left: "2rem" }),
            }}
          >
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

      {/* ExhibitOverlay outside the scaled container so it occupies real viewport space
          and its fixed positioning / scroll work correctly at any screen size. */}
      <ExhibitOverlay popup={activePopup} onClose={handleClose} />

      {/* On-screen controls for touch devices — virtual joystick + interact button.
          Outside the scaled container so it sits in real (thumb-reachable) viewport space. */}
      <TouchControls
        visible={isTouch && !isLoading && !activePopup && !bigMap}
        nearby={!!prompt}
        onMove={(x, y) => engineRef.current?.setMoveVector(x, y)}
        onInteract={() => { startBgMusic(); engineRef.current?.triggerInteract(); }}
      />
    </div>
  );
}
