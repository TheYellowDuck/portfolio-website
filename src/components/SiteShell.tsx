"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";
import Portfolio from "./site/Portfolio";
import ResumePopup from "./overlays/ResumePopup";
import TranscriptPopup from "./overlays/TranscriptPopup";

// Game (engine + ~115 sprites) loads only when the visitor chooses to enter.
const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

// Staged cross-fade. Enter: site fades out → world (game background) fades in →
// player fades in → HUD fades in. Leave reverses it. Each step is one `FADE_MS` beat.
type Stage =
  | "site"
  | "in-fade" | "in-bg" | "in-player" | "game"
  | "out-hud" | "out-player" | "out-bg" | "out-fade";
type Modal = null | "resume" | "transcript";

const FADE_MS = 420;

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export default function SiteShell() {
  const [stage, setStage] = useState<Stage>("site");
  const [modal, setModal] = useState<Modal>(null);
  // Game-layer opacity flag (mounts at 0, fades to 1) so the site visibly
  // cross-fades to the dark room rather than being covered instantly.
  const [gameOn, setGameOn] = useState(false);

  const reduceMotion = usePrefersReducedMotion();
  const gameReadyRef = useRef(false);
  const fadeDoneRef = useRef(false);
  const bgStartedRef = useRef(false);
  const scrollYRef = useRef(0);

  // Lock page scroll while off the plain site; restore scroll on return.
  useEffect(() => {
    if (stage === "site") {
      document.body.classList.remove("game-active");
      window.scrollTo(0, scrollYRef.current);
    } else {
      document.body.classList.add("game-active");
    }
  }, [stage]);
  useEffect(() => () => document.body.classList.remove("game-active"), []);

  // Esc closes whichever site modal is open.
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  // Start the background fade once the site has faded out AND the engine is ready.
  const maybeStartBg = useCallback(() => {
    if (bgStartedRef.current) return;
    if (gameReadyRef.current && fadeDoneRef.current) {
      bgStartedRef.current = true;
      setStage("in-bg");
    }
  }, []);

  const handleGameReady = useCallback(() => {
    gameReadyRef.current = true;
    maybeStartBg();
  }, [maybeStartBg]);

  const enterGame = useCallback(() => {
    if (stage !== "site") return;
    scrollYRef.current = window.scrollY;
    gameReadyRef.current = false;
    fadeDoneRef.current = false;
    bgStartedRef.current = false;
    if (reduceMotion) { setGameOn(true); setStage("game"); return; }
    setGameOn(false);   // fades to 1 on the next frame (in-fade effect)
    setStage("in-fade");
  }, [stage, reduceMotion]);

  const exitGame = useCallback(() => {
    if (stage !== "game") return;
    if (reduceMotion) { setGameOn(false); setStage("site"); return; }
    setStage("out-hud");
  }, [stage, reduceMotion]);

  // Sequence each stage on a timer matched to the CSS fade duration.
  useEffect(() => {
    const next = (s: Stage, ms = FADE_MS) => {
      const t = window.setTimeout(() => setStage(s), ms);
      return () => clearTimeout(t);
    };
    switch (stage) {
      case "in-fade": {
        fadeDoneRef.current = false;
        const raf = requestAnimationFrame(() => requestAnimationFrame(() => setGameOn(true)));
        const t = window.setTimeout(() => { fadeDoneRef.current = true; maybeStartBg(); }, FADE_MS);
        return () => { cancelAnimationFrame(raf); clearTimeout(t); };
      }
      case "in-bg":      return next("in-player");
      case "in-player":  return next("game");
      case "out-hud":    return next("out-player");
      case "out-player": return next("out-bg");
      case "out-bg": {
        // Dark fades out + site fades back in (the reverse cross-fade).
        const t = window.setTimeout(() => { setGameOn(false); setStage("out-fade"); }, FADE_MS);
        return () => clearTimeout(t);
      }
      case "out-fade":   return next("site");
    }
  }, [stage, maybeStartBg]);

  // Derived view state
  const gameMounted = stage !== "site";
  const siteOpacity = stage === "site" || stage === "out-fade" ? 1 : 0;
  const worldOpacity =
    stage === "in-bg" || stage === "in-player" || stage === "game" || stage === "out-hud" || stage === "out-player" ? 1 : 0;
  const playerVisible = stage === "in-player" || stage === "game" || stage === "out-hud";
  const hudOpacity = stage === "game" ? 1 : 0;
  const fadeMs = reduceMotion ? 0 : FADE_MS;
  const audible = !stage.startsWith("out"); // fade music out across the leave stages

  return (
    <>
      {/* Site layer — plain flow (sticky nav + scroll unaffected); fades out under the game. */}
      <div
        aria-hidden={stage !== "site"}
        style={{
          opacity: siteOpacity,
          transition: `opacity ${fadeMs}ms ease`,
          pointerEvents: stage === "site" ? undefined : "none",
        }}
      >
        <Portfolio
          onEnter={enterGame}
          onResume={() => setModal("resume")}
          onTranscript={() => setModal("transcript")}
        />
      </div>

      {/* Game layer — dark room cross-fades in over the site, then the staged fades
          run inside (background canvas → player → HUD). */}
      {gameMounted && (
        <div
          className="fixed inset-0 z-40 bg-[#1c1508]"
          style={{ opacity: gameOn ? 1 : 0, transition: `opacity ${fadeMs}ms ease` }}
        >
          <GameCanvas
            onReady={handleGameReady}
            hideLoadingScreen={stage !== "game"}
            worldOpacity={worldOpacity}
            hudOpacity={hudOpacity}
            playerVisible={playerVisible}
            fadeMs={fadeMs}
            audible={audible}
          />
        </div>
      )}

      {/* Leave affordance while playing. */}
      {stage === "game" && (
        <button
          onClick={exitGame}
          className="fixed left-1/2 z-60 -translate-x-1/2 rounded-full border border-[rgba(122,158,126,0.6)] bg-[rgba(254,249,236,0.92)] px-4 py-1.5 font-mono text-[13px] text-walnut shadow-[0_4px_20px_rgba(28,21,8,0.35)] backdrop-blur transition-colors hover:bg-[rgba(234,229,216,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          ← Leave museum
        </button>
      )}

      {/* Site modals (resume / transcript) reuse the game's overlay components. */}
      <AnimatePresence>
        {modal === "resume" && <ResumePopup key="resume" onClose={() => setModal(null)} />}
        {modal === "transcript" && <TranscriptPopup key="transcript" onClose={() => setModal(null)} />}
      </AnimatePresence>
    </>
  );
}
