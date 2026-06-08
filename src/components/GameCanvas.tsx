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
import NpcDialog from "./NpcDialog";

const BG_MUSIC_SRCS = [
  "/assets/audio/Interior Birdecorator Explore_CUTE.m4a",
  "/assets/audio/Interior Birdecorator Explore_CUTE.ogg",
];
const BG_VOL = 0.1;          // background-music target volume
const BG_FADE_IN_MS = 900;   // fade up when the music first starts
const BG_FADE_OUT_MS = 1200; // fade down when leaving the museum

// SSR/pre-mount fallback — overwritten at mount with the actual viewport size.
const BASE_W = 1920;
const BASE_H = 1080;

// World zoom: the engine renders at a fixed TILE_SIZE px/tile, then the canvas is
// CSS-scaled by `s`. On-screen px/tile = TILE_SIZE * s. We never zoom past native
// (s ≤ 1) but zoom out enough that the SHORTER viewport side always shows at least
// this many tiles — so a phone isn't over-zoomed in either orientation.
const MIN_TILES_SHORT = 10;

interface GameCanvasProps {
  /** Fires once the engine's sprites are loaded and the world is ready. */
  onReady?: () => void;
  /** Suppress the built-in splash (the portal transition is the loading visual). */
  hideLoadingScreen?: boolean;
  /** Opacity of the world canvas (the "game background"). */
  worldOpacity?: number;
  /** Opacity of the HUD chrome (minimap, hints, mute, touch controls). */
  hudOpacity?: number;
  /** Fade the engine player in/out (tweened over `fadeMs`). */
  playerVisible?: boolean;
  /** Fade duration for the above, in ms (0 = instant). */
  fadeMs?: number;
  /** When false (e.g. while leaving), the background music fades out. */
  audible?: boolean;
}

export default function GameCanvas({
  onReady,
  hideLoadingScreen = false,
  worldOpacity = 1,
  hudOpacity = 1,
  playerVisible = true,
  fadeMs = 0,
  audible = true,
}: GameCanvasProps = {}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const onReadyRef   = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const engineRef    = useRef<GameEngine | null>(null);
  const howlCache    = useRef<Map<string, Howl>>(new Map());
  const footstepHowls = useRef<Howl[]>([]);
  const scaleRef     = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);
  // Render base size — recomputed from the viewport on every layout.
  const baseSizeRef  = useRef({ w: BASE_W, h: BASE_H });

  const minimapDrawRef  = useRef<((x: number, y: number) => void) | null>(null);
  // Per-NPC interaction count → intro on first talk, jokes (cycled) thereafter.
  const dialogVisitsRef = useRef<Map<Exhibit, number>>(new Map());
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
    // Start silent and fade up so the music eases in rather than popping.
    const howl = new Howl({ src: BG_MUSIC_SRCS, loop: true, volume: 0 });
    bgMusicRef.current = howl;
    howl.play();
    howl.fade(0, BG_VOL, BG_FADE_IN_MS);
  }, []);

  // Fade the music down when leaving (audible → false), back up when audible again.
  useEffect(() => {
    const howl = bgMusicRef.current;
    if (!howl) return;
    howl.fade(howl.volume(), audible ? BG_VOL : 0, audible ? BG_FADE_IN_MS : BG_FADE_OUT_MS);
  }, [audible]);

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
  const [dialog, setDialog]             = useState<{ lines: string[]; idx: number } | null>(null);

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

  // NPC dialog: advance to the next line, or close (and unpause) on the last.
  const advanceDialog = useCallback(() => {
    setDialog((d) => {
      if (!d) return null;
      if (d.idx < d.lines.length - 1) return { lines: d.lines, idx: d.idx + 1 };
      engineRef.current?.setPaused(false);
      return null;
    });
  }, []);
  const closeDialog = useCallback(() => {
    setDialog(null);
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

  // While an NPC dialog is open: E / Enter / Space advances, Esc / ` closes.
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "`") { e.preventDefault(); closeDialog(); }
      else if (e.key === "e" || e.key === "E" || e.key === "Enter" || e.key === " ") { e.preventDefault(); advanceDialog(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, advanceDialog, closeDialog]);

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
        case "nearby":  setPrompt((event.content.dialog || event.content.jokes) ? "Press E to talk" : "Press E to inspect"); break;
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
          if (exhibit.dialog?.length || exhibit.jokes?.length) {
            const visits = dialogVisitsRef.current.get(exhibit) ?? 0;
            dialogVisitsRef.current.set(exhibit, visits + 1);
            const hasIntro = !!exhibit.dialog?.length;
            // First talk → intro; after that → cycle through the jokes.
            let lines: string[] | undefined;
            if (visits === 0 && hasIntro) {
              lines = exhibit.dialog;
            } else if (exhibit.jokes?.length) {
              lines = exhibit.jokes[(hasIntro ? visits - 1 : visits) % exhibit.jokes.length];
            } else {
              lines = exhibit.dialog;
            }
            if (lines?.length) {
              setDialog({ lines, idx: 0 });
              setPrompt(null);
              setShowControls(false);
              engine.setPaused(true);
            }
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
      onReadyRef.current?.();
    };
    engine.onPositionChange = (x, y) => minimapDrawRef.current?.(x, y);
    engine.start();
    engine.setPaused(true);

    // On unmount (leaving the game), stop the loop and fully reset audio so the
    // background music / SFX don't linger or double up when re-entering.
    return () => { engine.stop(); Howler.unload(); };
  }, []);

  // Fade the engine player in/out (the portal fades the world in first, then the
  // player). Tweens engine.playerAlpha directly — no React re-renders per frame.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const target = playerVisible ? 1 : 0;
    if (fadeMs <= 0) { engine.playerAlpha = target; return; }
    let raf = 0;
    const from = engine.playerAlpha;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / fadeMs);
      engine.playerAlpha = from + (target - from) * t;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playerVisible, fadeMs]);

  return (
    // Outer: fills viewport, clips edges that zoom-fill pushes past screen boundary.
    <div className="fixed inset-0 overflow-hidden bg-[#1c1508]">
      {/* Scaled world: base canvas centered via absolute+negative-margin, CSS-scaled
          by updateLayout. Only the canvas lives here so the HUD never scales with zoom. */}
      <div
        ref={containerRef}
        className="absolute overflow-hidden origin-center"
        style={{ top: "50%", left: "50%", opacity: worldOpacity, transition: `opacity ${fadeMs}ms ease` }}
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

      {!hideLoadingScreen && (
        <LoadingScreen
          visible={isLoading}
          loaded={progress.loaded}
          total={progress.total}
        />
      )}

      {/* HUD chrome — real viewport coordinates, never scaled with the world zoom. */}
      <div
        className="fixed inset-2 z-10 pointer-events-none"
        style={{ opacity: hudOpacity, transition: `opacity ${fadeMs}ms ease` }}
      >
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

      {/* NPC dialog (e.g. "me" at the desk) — sequential lines, advance on E / tap. */}
      <NpcDialog
        line={dialog ? dialog.lines[dialog.idx] : null}
        hasNext={dialog ? dialog.idx < dialog.lines.length - 1 : false}
        onAdvance={advanceDialog}
      />

      {/* On-screen controls for touch devices — virtual joystick + interact button.
          Outside the scaled container so it sits in real (thumb-reachable) viewport space.
          Faded with the rest of the HUD during the portal transition. */}
      <div style={{ opacity: hudOpacity, transition: `opacity ${fadeMs}ms ease` }}>
        <TouchControls
          visible={isTouch && !isLoading && !activePopup && !bigMap && !dialog}
          nearby={!!prompt}
          onMove={(x, y) => engineRef.current?.setMoveVector(x, y)}
          onInteract={() => { startBgMusic(); engineRef.current?.triggerInteract(); }}
        />
      </div>
    </div>
  );
}
