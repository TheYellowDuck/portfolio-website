"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { GameEngine, GameEvent } from "@/game/engine";
import { TILE_SIZE } from "@/game/tilemap";
import { interactables } from "@/game/interactables";
import { Exhibit, ExhibitPopup } from "@/data/projects";
import { slugForPopup } from "@/lib/exhibit-slugs";
import { loadDiscovered, saveDiscovered, loadAudioPrefs, saveAudioPrefs } from "@/lib/museum-prefs";
import { Howl, Howler } from "howler";
import BottomHint from "./BottomHint";
import ExhibitOverlay from "./overlays/ExhibitOverlay";
import LoadingScreen from "./LoadingScreen";
import Minimap from "./Minimap";
import TouchControls from "./TouchControls";
import NpcDialog from "./NpcDialog";

const BG_MUSIC_SRCS = [
  "/assets/audio/museum-theme.m4a",
  "/assets/audio/museum-theme.ogg",
];
const BG_VOL = 0.1;          // background-music target volume
const BG_FADE_IN_MS = 900;   // fade up when the music first starts
const BG_FADE_OUT_MS = 1200; // fade down when leaving the museum
const QUACK_VOLUME = 1;      // quack gain is baked into the file (already ~¼ of the raw clip)

// SSR/pre-mount fallback — overwritten at mount with the actual viewport size.
const BASE_W = 1920;
const BASE_H = 1080;

// World zoom: the engine renders at a fixed TILE_SIZE px/tile, then the canvas is
// CSS-scaled by `s`. On-screen px/tile = TILE_SIZE * s. We never zoom past native
// (s ≤ 1) but zoom out enough that the SHORTER viewport side always shows at least
// this many tiles — so a phone isn't over-zoomed in either orientation.
const MIN_TILES_SHORT = 10;

// Inspectable exhibits (pedestals with a popup) — the denominator for "discovered".
const TOTAL_EXHIBITS = interactables.filter((i) => i.content.popup).length;

// The "Curator" reward: a hidden placard revealed once every exhibit is inspected.
const CURATOR_REWARD: ExhibitPopup = {
  title: "Curator's Note",
  subtitle: "You've seen every exhibit",
  description:
    "Most visitors wander a room or two — you walked the whole museum. Thank you for taking the time. " +
    "I built this place because a page of bullet points never felt like enough; I wanted somewhere you " +
    "could actually step into the work. If any of it stuck with you, I'd genuinely love to hear from you. — George",
  links: [
    { label: "Email", url: "mailto:gzhang06@outlook.com" },
    { label: "LinkedIn", url: "https://linkedin.com/in/iamgeorgezhang/" },
    { label: "GitHub", url: "https://github.com/TheYellowDuck" },
  ],
};

// A breath back in the museum between consecutive popups, so queued ones don't appear back-to-back.
const POPUP_GAP_MS = 700;

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
  /** True once the leave-to-site fade has begun, so an open exhibit popup closes out first. */
  leaving?: boolean;
}

export default function GameCanvas({
  onReady,
  hideLoadingScreen = false,
  worldOpacity = 1,
  hudOpacity = 1,
  playerVisible = true,
  fadeMs = 0,
  audible = true,
  leaving = false,
}: GameCanvasProps = {}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const onReadyRef   = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const engineRef    = useRef<GameEngine | null>(null);
  // Per-session id so a visitor never sees their own ghost in the same session; submitted-once guard.
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  );
  const ghostSubmittedRef = useRef(false);
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
  const [musicStarted, setMusicStarted] = useState(false);

  // Audio volumes (0–1), persisted. Refs mirror the state for use inside the
  // engine's play callbacks; the file is client-only so localStorage is safe.
  const [initialAudio] = useState(loadAudioPrefs);
  const [musicVol, setMusicVol] = useState(initialAudio.music);
  const [sfxVol, setSfxVol]     = useState(initialAudio.sfx);
  const musicVolRef = useRef(initialAudio.music);
  const sfxVolRef   = useRef(initialAudio.sfx);
  const [showSettings, setShowSettings] = useState(false);

  // Exhibits discovered (inspected), persisted.
  const [initialDiscovered] = useState(loadDiscovered);
  const discoveredRef = useRef(initialDiscovered);
  const [discoveredCount, setDiscoveredCount] = useState(initialDiscovered.size);
  // "Curator" completion reward: a warm glow flash, then the note is revealed when
  // the last exhibit's popup is closed.
  const [curatorGlow, setCuratorGlow] = useState(false);
  const rewardPendingRef = useRef(false);
  // Single-popup stage with a queue: only one exhibit popup shows at a time; the rest (including
  // the curator's note) wait their turn so none overwrites another. activePopupRef mirrors
  // activePopup for the engine's event callback; queueRef holds what's waiting.
  const activePopupRef = useRef<ExhibitPopup | null>(null);
  const queueRef = useRef<ExhibitPopup[]>([]);

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
    howl.fade(0, BG_VOL * musicVolRef.current, BG_FADE_IN_MS);
  }, []);

  // Fade the music down when leaving (audible → false), back up when audible again.
  useEffect(() => {
    const howl = bgMusicRef.current;
    if (!howl) return;
    howl.fade(howl.volume(), audible ? BG_VOL * musicVolRef.current : 0, audible ? BG_FADE_IN_MS : BG_FADE_OUT_MS);
  }, [audible]);

  // Volume sliders (0–1), persisted. SFX is applied per-play (see engine.onEvent);
  // music is applied live to the running track.
  const applyMusicVol = useCallback((v: number) => {
    musicVolRef.current = v;
    setMusicVol(v);
    saveAudioPrefs({ music: v, sfx: sfxVolRef.current });
    bgMusicRef.current?.volume(BG_VOL * v);
  }, []);
  const applySfxVol = useCallback((v: number) => {
    sfxVolRef.current = v;
    setSfxVol(v);
    saveAudioPrefs({ music: musicVolRef.current, sfx: v });
  }, []);

  const [isLoading, setIsLoading]       = useState(true);
  const [progress, setProgress]         = useState({ loaded: 0, total: 0 });
  const [prompt, setPrompt]             = useState<string | null>(null);
  const [activePopup, setActivePopup]   = useState<ExhibitPopup | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [bigMap, setBigMap]             = useState(false);
  const [isTouch, setIsTouch]           = useState(false);
  const [dialog, setDialog]             = useState<{ lines: string[]; idx: number } | null>(null);
  // Mirror of `dialog` readable from the (mount-time) engine event handler.
  const dialogRef = useRef(false);
  useEffect(() => { dialogRef.current = !!dialog; }, [dialog]);
  // Latest player position, and where the player stood when a dialog opened — used to
  // close the conversation only once they've actually walked a few px away.
  const lastPosRef = useRef({ x: 0, y: 0 });
  const dialogOpenPosRef = useRef({ x: 0, y: 0 });

  // Coarse pointer → show on-screen touch controls (also true in mobile emulation).
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Honor prefers-reduced-motion for the drifting ghosts — freeze them to a quiet glow (and react if
  // the user toggles the OS setting while the museum is open).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => engineRef.current?.setGhostsReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Touch users may never fire a key or canvas click — start music on first touch.
  useEffect(() => {
    const onFirstPointer = () => startBgMusic();
    window.addEventListener("pointerdown", onFirstPointer, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstPointer);
  }, [startBgMusic]);

  // Entering the game is itself a user gesture (the "Step inside" click that mounts
  // this component), so the page is activated — start the music on mount rather than
  // waiting for an interaction inside the game. The pointer/heartbeat paths above
  // remain as fallbacks if the browser defers the first play.
  useEffect(() => { startBgMusic(); }, [startBgMusic]);

  // Dev-only shortcuts (no-op in production): Shift+R resets discovered exhibits,
  // Shift+C marks every exhibit discovered and previews the curator reward.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const allSlugs = interactables
      .filter((i) => i.content.popup)
      .map((i) => slugForPopup(i.content.popup!))
      .filter((s): s is string => !!s);
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      if (e.code === "KeyR") {
        discoveredRef.current = new Set();
        setDiscoveredCount(0);
        saveDiscovered(discoveredRef.current);
      } else if (e.code === "KeyC") {
        discoveredRef.current = new Set(allSlugs);
        setDiscoveredCount(discoveredRef.current.size);
        saveDiscovered(discoveredRef.current);
        rewardPendingRef.current = false;
        activePopupRef.current = CURATOR_REWARD;
        setCuratorGlow(true);
        setActivePopup(CURATOR_REWARD);
        engineRef.current?.setPaused(true);
      }
    };
    window.addEventListener("keydown", onKey);
    console.info("[dev] Shift+R = reset exhibits · Shift+C = complete + show reward");
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // Display a popup now: mirror it to the ref, pause the world, hide the HUD, and (for the note)
  // bloom the curator glow. The queue decides *whether* to show now or wait — see below.
  const present = useCallback((popup: ExhibitPopup) => {
    activePopupRef.current = popup;
    setActivePopup(popup);
    setPrompt(null);
    setShowControls(false);
    if (popup === CURATOR_REWARD) setCuratorGlow(true);
    engineRef.current?.setPaused(true);
  }, []);
  // Stable handle so the engine's one-time onEvent closure can present without re-running setup.
  const presentRef = useRef(present);

  const handleClose = useCallback(() => {
    activePopupRef.current = null;
    setActivePopup(null);
    setCuratorGlow(false);   // closing the note (or any popup) clears the warm glow

    // Completing the museum: the curator's note reveals after a beat in the gallery. If the player
    // opens anything during that beat it shows first and the note falls in behind it (queued); if
    // the note is already up, a newly-opened popup waits behind it. Either way nothing is lost.
    if (rewardPendingRef.current) {
      rewardPendingRef.current = false;
      window.setTimeout(() => {
        if (activePopupRef.current) queueRef.current.push(CURATOR_REWARD);
        else present(CURATOR_REWARD);
      }, 1500);
    }

    // Hand control back for a beat, then bring the next queued popup in — a gap between popups
    // rather than back-to-back. If the player opens something during the gap, the queued one falls
    // in behind it (re-queued).
    engineRef.current?.setPaused(false);
    const next = queueRef.current.shift();
    if (next) {
      window.setTimeout(() => {
        if (activePopupRef.current) queueRef.current.push(next);
        else present(next);
      }, POPUP_GAP_MS);
    }
  }, [present]);

  // NPC dialog: advance to the next line, or close (and unpause) on the last.
  const advanceDialog = useCallback(() => {
    setDialog((d) => {
      if (!d) return null;
      if (d.idx < d.lines.length - 1) return { lines: d.lines, idx: d.idx + 1 };
      return null; // end of dialog (the engine was never paused for it)
    });
  }, []);
  const closeDialog = useCallback(() => {
    setDialog(null); // the engine isn't paused for dialogs, so nothing to resume
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

  // While an NPC dialog is open: E / Enter / Space advances, Esc / ` closes. Movement
  // isn't handled here — the engine (never paused for dialogs) moves the player and the
  // "active" event closes the dialog, so you simply walk away.
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
    engine.setGhostsReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Other visitors to replay as drifting ghosts (excluding this session). Falls back to procedural
    // wanderers when there are none yet / the store isn't configured — the room is never empty.
    fetch("/api/ghosts")
      .then((r) => r.json())
      .then((d) => engine.setGhosts(Array.isArray(d?.recordings) ? d.recordings : [], sessionId))
      .catch(() => engine.setGhosts([], sessionId));

    engine.onFootstep = () => {
      if (!footstepHowls.current.length) {
        footstepHowls.current = [new Howl({ src: ["/assets/audio/footstep.wav"] })];
      }
      const h = footstepHowls.current[0];
      h.volume(0.15 * sfxVolRef.current);
      h.play();
    };

    engine.onEvent = (event: GameEvent) => {
      switch (event.type) {
        case "nearby":  setPrompt((event.content.dialog || event.content.jokes) ? "Press E to talk" : "Press E to inspect"); break;
        case "leave":   setPrompt(null); break;
        case "idle":    setShowControls(true); break;
        case "active":  setShowControls(false); break;
        case "interact": {
          if (dialogRef.current) break; // mid-conversation: E advances the dialog, not re-interact
          const exhibit: Exhibit = event.content;
          {
            let howl = howlCache.current.get("__interact__");
            if (!howl) {
              howl = new Howl({ src: ["/assets/audio/interact.wav"] });
              howlCache.current.set("__interact__", howl);
            }
            howl.volume(0.05 * sfxVolRef.current);
            howl.play();
          }
          if (exhibit.audio) {
            let howl = howlCache.current.get(exhibit.audio);
            if (!howl) {
              howl = new Howl({ src: [exhibit.audio] });
              howlCache.current.set(exhibit.audio, howl);
            }
            howl.volume(QUACK_VOLUME * sfxVolRef.current);
            howl.play();
          }
          if (exhibit.popup) {
            // Show now, or queue behind whatever's already open (the queue prevents races).
            if (activePopupRef.current) queueRef.current.push(exhibit.popup);
            else presentRef.current(exhibit.popup);
            // Mark this exhibit discovered (persisted).
            const slug = slugForPopup(exhibit.popup);
            if (slug && !discoveredRef.current.has(slug)) {
              discoveredRef.current.add(slug);
              setDiscoveredCount(discoveredRef.current.size);
              saveDiscovered(discoveredRef.current);
              // Just inspected the final exhibit → the curator's note reveals after the
              // player closes this popup (see handleClose).
              if (discoveredRef.current.size === TOTAL_EXHIBITS) {
                rewardPendingRef.current = true;
              }
            }
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
              // Talking does NOT pause the engine — the player can walk away, which
              // closes the dialog (see onPositionChange) once they move off this spot.
              dialogOpenPosRef.current = { ...lastPosRef.current };
              setDialog({ lines, idx: 0 });
              setPrompt(null);
              setShowControls(false);
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
    engine.onPositionChange = (x, y) => {
      minimapDrawRef.current?.(x, y);
      lastPosRef.current = { x, y };
      // Walk away from a conversation: close once they've moved a few px from where
      // the dialog opened (this fires every frame, so a plain check would close it instantly).
      if (dialogRef.current &&
          Math.hypot(x - dialogOpenPosRef.current.x, y - dialogOpenPosRef.current.y) > 6) {
        setDialog(null);
      }
    };
    engine.start();
    engine.setPaused(true);

    // On unmount (leaving the game), stop the loop and fully reset audio so the
    // background music / SFX don't linger or double up when re-entering. Clearing the
    // music refs lets a remount start a fresh track — without it, React Strict Mode's
    // double-invoke (and re-entering) would unload the track yet leave the "started"
    // guard set, so the next start no-ops and you get silence.
    return () => {
      engine.stop();
      Howler.unload();
      musicStartedRef.current = false;
      bgMusicRef.current = null;
    };
  }, [sessionId]);

  // Submit this session's recorded path once on leave — on unmount (leaving the museum) and on tab
  // close (pagehide, via sendBeacon). Skipped if the visitor barely moved.
  useEffect(() => {
    const submit = () => {
      if (ghostSubmittedRef.current) return;
      const pts = engineRef.current?.getRecording();
      if (!pts || pts.length < 6) return;
      ghostSubmittedRef.current = true;
      const body = JSON.stringify({ id: sessionId, pts });
      try {
        if (navigator.sendBeacon) navigator.sendBeacon("/api/ghosts", new Blob([body], { type: "application/json" }));
        else fetch("/api/ghosts", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
      } catch { /* best-effort */ }
    };
    window.addEventListener("pagehide", submit);
    return () => { window.removeEventListener("pagehide", submit); submit(); };
  }, [sessionId]);

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
          role="img"
          aria-label="Interactive pixel-art museum. Walk with WASD or arrow keys; press E near a glowing exhibit to inspect it. All content is also on the main site."
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
        {/* One bottom-center hint. The idle controls hint takes priority over the
            interactable prompt, and `mode="wait"` fades one fully out before the other
            in. The prompt is desktop-only — on touch the glowing E button signals inspect. */}
        <BottomHint
          kind={
            dialog ? null /* the NPC dialog owns the bottom while talking */
              : showControls && !isLoading && !activePopup ? "controls"
              : prompt && !activePopup && !isTouch ? "prompt"
              : null
          }
          message={
            showControls && !isLoading && !activePopup
              ? (isTouch ? "Drag to move · push to run · tap E to inspect" : "WASD to move · Shift to sprint")
              : (prompt ?? "")
          }
          isTouch={isTouch}
        />
        <Minimap
          onRegisterDraw={handleRegisterMinimapDraw}
          bigMap={bigMap}
          isTouch={isTouch}
          onOpenBigMap={() => setBigMap(true)}
          onCloseBigMap={() => setBigMap(false)}
          onWalkToTile={(c, r) => engineRef.current?.walkToTile(c, r)}
        />
        {/* Exhibits-discovered counter. Desktop: full pill, top-left. Touch: a compact
            pill under the centered "Leave" button. Hidden under the full-screen overlay
            or map, but kept up during a (bottom-anchored) dialog. */}
        {!isLoading && !activePopup && !bigMap && (
          <div
            className="absolute z-10 rounded-2xl border border-[rgba(122,158,126,0.6)] bg-[rgba(254,249,236,0.92)] px-3 py-1.5 font-mono text-[12px] text-walnut/85 shadow-[0_4px_20px_rgba(28,21,8,0.15)]"
            style={
              isTouch
                // Sit just under the centered "Leave museum" button (top-left is the
                // sound button, top-right the minimap).
                ? { pointerEvents: "none", top: "calc(env(safe-area-inset-top, 0px) + 46px)", left: "50%", transform: "translateX(-50%)" }
                : { pointerEvents: "none", left: 0, top: 0 }
            }
            title="Exhibits inspected"
          >
            {isTouch
              ? `✦ ${discoveredCount}/${TOTAL_EXHIBITS}`
              : `✦ ${discoveredCount} / ${TOTAL_EXHIBITS} discovered`}
          </div>
        )}

        {musicStarted && (
          <div
            className="absolute z-20"
            style={{
              pointerEvents: "auto",
              ...(isTouch
                ? { top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: "calc(env(safe-area-inset-left, 0px) + 12px)" }
                : { bottom: "2rem", left: "2rem" }),
            }}
          >
            <button
              onClick={() => setShowSettings((s) => !s)}
              aria-label="Audio settings"
              aria-expanded={showSettings}
              className="rounded-2xl border border-[rgba(122,158,126,0.7)] bg-[rgba(254,249,236,0.95)] px-3 py-1.5 font-mono text-[13px] text-walnut shadow-[0_4px_20px_rgba(28,21,8,0.2)] hover:bg-[rgba(234,229,216,0.95)] transition-colors"
            >
              ⚙ sound
            </button>
            {showSettings && (
              <div
                className={`absolute w-52 rounded-2xl border border-[rgba(122,158,126,0.7)] bg-[rgba(254,249,236,0.97)] p-3.5 shadow-[0_8px_30px_rgba(28,21,8,0.3)] ${
                  isTouch ? "left-0 top-full mt-2" : "bottom-full left-0 mb-2"
                }`}
              >
                <VolumeSlider label="Music" value={musicVol} onChange={applyMusicVol} />
                <div className="mt-3">
                  <VolumeSlider label="Effects" value={sfxVol} onChange={applySfxVol} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* "Lamps warm up" — a one-shot warm glow on inspecting the final exhibit. */}
      {curatorGlow && <div className="curator-glow pointer-events-none fixed inset-0 z-[55]" aria-hidden />}

      {/* ExhibitOverlay outside the scaled container so it occupies real viewport space
          and its fixed positioning / scroll work correctly at any screen size. */}
      {/* While leaving, pass null so AnimatePresence fades the popup out first (it sits in real
          viewport space, so it wouldn't fade with the world otherwise). */}
      <ExhibitOverlay popup={leaving ? null : activePopup} onClose={handleClose} gentle={activePopup === CURATOR_REWARD} />

      {/* NPC dialog (e.g. "me" at the desk) — sequential lines, advance on E / tap. */}
      <NpcDialog
        line={dialog ? dialog.lines[dialog.idx] : null}
        hasNext={dialog ? dialog.idx < dialog.lines.length - 1 : false}
        onAdvance={advanceDialog}
        isTouch={isTouch}
      />

      {/* On-screen controls for touch devices — virtual joystick + interact button.
          Outside the scaled container so it sits in real (thumb-reachable) viewport space.
          Faded with the rest of the HUD during the portal transition. */}
      <div style={{ opacity: hudOpacity, transition: `opacity ${fadeMs}ms ease` }}>
        <TouchControls
          visible={isTouch && !isLoading && !activePopup && !bigMap}
          nearby={!!prompt}
          onMove={(x, y) => engineRef.current?.setMoveVector(x, y)}
          onInteract={() => { startBgMusic(); engineRef.current?.triggerInteract(); }}
        />
      </div>
    </div>
  );
}

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block select-none">
      <span className="flex items-center justify-between font-mono text-[12px] text-walnut/70">
        <span>{label}</span>
        <span className="text-walnut/45">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} volume`}
        className="mt-1.5 w-full cursor-pointer accent-sage"
      />
    </label>
  );
}
