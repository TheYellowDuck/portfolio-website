"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Portfolio from "./site/Portfolio";
import IntroCurtain from "./site/IntroCurtain";
import ExhibitOverlay from "./overlays/ExhibitOverlay";
import CommandPalette, { type Command } from "./site/CommandPalette";
import KonamiEasterEgg from "./site/KonamiEasterEgg";
import { mainHallExhibits, archiveExhibits, giftShopExhibits, type ExhibitPopup } from "@/data/projects";
import { getPopupBySlug, slugForPopup } from "@/lib/exhibit-slugs";
import { PERSON } from "@/lib/site";

// Game (engine + ~115 sprites) loads only when the visitor chooses to enter.
const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

// Staged cross-fade. Enter: site fades out → world (game background) fades in →
// player fades in → HUD fades in. Leave reverses it. Each step is one `FADE_MS` beat.
type Stage =
  | "site"
  | "in-fade" | "in-bg" | "in-player" | "game"
  | "out-hud" | "out-player" | "out-bg" | "out-fade";

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
  const [activePopup, setActivePopup] = useState<ExhibitPopup | null>(null);
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

  // Keep a long-open tab from *breaking* after a new deploy, without ever refreshing
  // the page out from under the visitor: if a lazily-loaded chunk 404s because its
  // hash changed in the newer build, reload once (seamlessly, restoring scroll).
  // We deliberately do NOT version-check on tab refocus — re-entering the tab must
  // never reload the page.
  useEffect(() => {
    const KEY = "museum:stale-reload";
    const SCROLL_KEY = "museum:restore-scroll";
    // A freshness reload should be invisible — land the visitor back where they were.
    try {
      const y = sessionStorage.getItem(SCROLL_KEY);
      if (y !== null) {
        sessionStorage.removeItem(SCROLL_KEY);
        requestAnimationFrame(() => window.scrollTo(0, Number(y) || 0));
      }
    } catch { /* ignore */ }
    const reloadFresh = () => {
      try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch { /* ignore */ }
      window.location.reload();
    };
    const isChunkError = (m?: string | null) =>
      !!m && /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(m);
    const reloadOnce = () => {
      if (sessionStorage.getItem(KEY)) return; // already tried — don't loop on a genuine failure
      sessionStorage.setItem(KEY, "1");
      reloadFresh();
    };
    const onError = (e: ErrorEvent) => { if (isChunkError(e.message)) reloadOnce(); };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string } | string | undefined;
      if (isChunkError(typeof r === "string" ? r : r?.message)) reloadOnce();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    // Stayed up without a chunk error — let a *future* stale deploy reload again.
    const clearGuard = window.setTimeout(() => sessionStorage.removeItem(KEY), 8000);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.clearTimeout(clearGuard);
    };
  }, []);


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

  // Begin entering the museum (the staged fade) — transition only, no history push.
  const startEnter = useCallback(() => {
    if (stage !== "site") return;
    scrollYRef.current = window.scrollY;
    gameReadyRef.current = false;
    fadeDoneRef.current = false;
    bgStartedRef.current = false;
    if (reduceMotion) { setGameOn(true); setStage("game"); return; }
    setGameOn(false);   // fades to 1 on the next frame (in-fade effect)
    setStage("in-fade");
  }, [stage, reduceMotion]);

  const enterGame = useCallback(() => {
    if (stage !== "site") return;
    // Push a marked history entry (preserving Next's router state) with no URL change, so the
    // browser/device Back button leaves the museum and Forward walks back in — invisibly, and
    // clear of the #slug popup deep-link system.
    window.history.pushState({ ...window.history.state, museum: true }, "");
    startEnter();
  }, [stage, startEnter]);

  const exitGame = useCallback(() => {
    if (stage === "site" || stage.startsWith("out")) return; // already on the site, or already leaving
    if (reduceMotion) { setGameOn(false); setStage("site"); return; }
    setStage("out-hud");
  }, [stage, reduceMotion]);

  // The in-game Leave button goes through history.back() so it shares one path with the Back
  // button and the history stack stays consistent (and Forward can still re-enter afterwards).
  const requestExitGame = useCallback(() => { window.history.back(); }, []);

  // Back/Forward across the museum entry → leave / re-enter the game. Direction comes from the
  // entry's own state: landing on the museum-marked entry enters, landing off it leaves. Each
  // call no-ops via its own stage guard when it doesn't apply (e.g. popup-hash navigation).
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (e.state?.museum) startEnter();
      else exitGame();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [startEnter, exitGame]);

  // Deep links: a modal is reflected in the URL hash (#slug) so it's shareable,
  // bookmarkable, and closable with the Back button.
  const openPopup = useCallback((popup: ExhibitPopup) => {
    setActivePopup(popup);
    const slug = slugForPopup(popup);
    if (slug && decodeURIComponent(window.location.hash.slice(1)) !== slug) {
      window.history.pushState(null, "", "#" + slug);
    }
  }, []);
  const closePopup = useCallback(() => {
    setActivePopup(null);
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);
  // Open the matching exhibit from the hash on load, and follow Back/Forward + nav.
  useEffect(() => {
    const sync = () => setActivePopup(getPopupBySlug(decodeURIComponent(window.location.hash.slice(1))));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Command palette (⌘K), grouped into subsections: Go to (sections) · Projects · Actions.
  const paletteCommands = useMemo<Command[]>(() => {
    const scrollTo = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const email =
      giftShopExhibits.flatMap((e) => e.popup?.links ?? []).find((l) => l.url.startsWith("mailto:"))?.url.replace("mailto:", "") ??
      PERSON.email;
    const sections: Command[] = [
      { id: "s-top", label: "Home", group: "Go to", keywords: "top hero intro start", run: scrollTo("top") },
      { id: "s-work", label: "Selected Work", group: "Go to", keywords: "projects portfolio", run: scrollTo("work") },
      { id: "s-exp", label: "Experience", group: "Go to", keywords: "work jobs", run: scrollTo("experience") },
      { id: "s-skills", label: "Skills", group: "Go to", keywords: "tech stack", run: scrollTo("skills") },
      { id: "s-about", label: "About", group: "Go to", keywords: "bio me", run: scrollTo("about") },
      { id: "s-cp", label: "Competitive Programming", group: "Go to", keywords: "leetcode dmoj problems grind", run: scrollTo("competitive") },
      { id: "s-contact", label: "Contact", group: "Go to", keywords: "email reach", run: scrollTo("contact") },
    ];
    const projects: Command[] = [...mainHallExhibits, ...archiveExhibits]
      .filter((e) => e.popup?.title)
      .map((e) => ({ id: "p-" + (slugForPopup(e.popup!) ?? e.popup!.title!), label: e.popup!.title!, group: "Projects", run: () => openPopup(e.popup!) }));
    const actions: Command[] = [
      { id: "enter", label: "Step inside the museum", group: "Actions", hint: "Game", keywords: "play explore pixel", run: () => enterGame() },
      { id: "resume", label: "Open résumé", group: "Actions", hint: "Doc", keywords: "cv", run: () => openPopup({ type: "resume" }) },
      { id: "transcript", label: "Education & transcript", group: "Actions", hint: "Doc", keywords: "school waterloo grades", run: () => openPopup({ type: "transcript" }) },
      { id: "email", label: "Copy email address", group: "Actions", hint: "Contact", keywords: "mail reach", run: () => navigator.clipboard?.writeText(email) },
    ];
    return [...sections, ...projects, ...actions];
  }, [enterGame, openPopup]);

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
  const leaving = stage.startsWith("out");  // an open exhibit popup fades out first as we leave

  return (
    <>
      {/* Intro curtain — masks first paint, then lifts once web fonts are ready (not on a timer).
          The "lights coming up": warm lamp glow blooms, name + label + underline stage in. */}
      <IntroCurtain />

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
          onResume={() => openPopup({ type: "resume" })}
          onTranscript={() => openPopup({ type: "transcript" })}
          onOpenProject={openPopup}
        />
      </div>

      {/* Game layer — dark room cross-fades in over the site, then the staged fades
          run inside (background canvas → player → HUD). */}
      {gameMounted && (
        <div
          className="game-warm fixed inset-0 z-40 bg-[#1c1508]"
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
            leaving={leaving}
          />
        </div>
      )}

      {/* Reassurance while the world loads on the dark (between the cross-fade and
          the background fading in). */}
      {stage === "in-fade" && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          style={{ opacity: gameOn ? 1 : 0, transition: `opacity ${fadeMs}ms ease` }}
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.35em] text-[rgba(240,228,196,0.5)]">
            entering the museum…
          </p>
        </div>
      )}

      {/* Leave affordance while playing. */}
      {stage === "game" && (
        <button
          onClick={requestExitGame}
          className="game-warm fixed left-1/2 z-60 -translate-x-1/2 rounded-full border border-[rgba(122,158,126,0.6)] bg-[rgba(254,249,236,0.92)] px-4 py-1.5 font-mono text-[13px] text-walnut shadow-[0_4px_20px_rgba(28,21,8,0.35)] backdrop-blur transition-colors hover:bg-[rgba(234,229,216,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          ← Leave<span className="hidden sm:inline"> museum</span>
        </button>
      )}

      {/* Site detail modals reuse the game's exhibit overlay (text, tags, grouped
          skills, links, embeds) — and route resume/transcript to their viewers. */}
      <ExhibitOverlay popup={activePopup} onClose={closePopup} />

      {/* ⌘K command palette (site only). */}
      <CommandPalette commands={paletteCommands} enabled={stage === "site"} />

      {/* Konami code easter egg (site only, so it doesn't fire while walking with arrows). */}
      <KonamiEasterEgg enabled={stage === "site"} />
    </>
  );
}
