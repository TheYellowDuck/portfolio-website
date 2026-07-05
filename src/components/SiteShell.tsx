// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Portfolio from "./site/Portfolio";
import { content } from "@/content";
import IntroCurtain from "./site/IntroCurtain";
import IntroCinematic, { INTRO_SEEN_KEY } from "./site/IntroCinematic";
import { armIntro, introArmed, introGate } from "@/lib/intro-gate";
import WaterBackground from "./site/WaterBackground";
import ExhibitOverlay from "./overlays/ExhibitOverlay";
import CommandPalette, { type Command } from "./site/CommandPalette";
import KonamiEasterEgg from "./site/KonamiEasterEgg";
import { PressButton } from "./PressButton";
import { mainHallExhibits, archiveExhibits, giftShopExhibits, type ExhibitPopup } from "@/data/projects";
import { getPopupBySlug, slugForPopup } from "@/lib/exhibit-slugs";
import { PERSON } from "@/lib/site";

// Game (engine + ~115 sprites) loads only when the visitor chooses to enter.
const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

// Staged cross-fade. Enter: site fades out → world (game background) fades in →
// player fades in → HUD fades in. Leave reverses it. Each step is one `FADE_MS` beat.
type Stage =
  | "site"
  | "in-site" | "in-fade" | "in-bg" | "in-player" | "game"
  | "out-hud" | "out-player" | "out-bg" | "out-fade" | "out-site";

const FADE_MS = 420;
// How far the header trails the content (and vice-versa) so the transition reads as content → header
// → game. Also the extra time the dedicated site-fade beat (in-site) runs beyond one fade.
const HEADER_LAG = Math.round(FADE_MS * 0.55);

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

export default function SiteShell({ currentStatus }: { currentStatus?: string }) {
  const [stage, setStage] = useState<Stage>("site");
  const [activePopup, setActivePopup] = useState<ExhibitPopup | null>(null);
  // Game-layer opacity flag (mounts at 0, fades to 1) so the site visibly
  // cross-fades to the dark room rather than being covered instantly.
  const [gameOn, setGameOn] = useState(false);

  const reduceMotion = usePrefersReducedMotion();

  // 3D glass-drop intro (first visit per session). Armed SYNCHRONOUSLY during the first client
  // render — before any child mounts — so gated entrances (hero scramble) can't start behind the
  // overlay. The overlay itself mounts via effect state (SSR markup must not change: the SSR'd
  // IntroCurtain covers that first frame). `introHidden` holds the page invisible until the drop's
  // contact frame, when the ripple fires and everything arrives together.
  const [cinematicOn, setCinematicOn] = useState(false);
  const [introHidden, setIntroHidden] = useState(false);
  const armDecidedRef = useRef(false);
  if (typeof window !== "undefined" && !armDecidedRef.current) {
    armDecidedRef.current = true;
    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && !sessionStorage.getItem(INTRO_SEEN_KEY)) {
        armIntro();
      }
    } catch { /* storage blocked → skip the cinematic */ }
  }
  useEffect(() => {
    if (!introArmed()) return;
    setCinematicOn(true);
    setIntroHidden(true);
    introGate().then(() => setIntroHidden(false)); // contact: ripple + content arrive together
  }, []);
  // Stable identity — an inline arrow would re-run IntroCinematic's effect (and restart the
  // timeline from zero) on every SiteShell re-render.
  const handleCinematicDone = useCallback(() => setCinematicOn(false), []);

  const gameReadyRef = useRef(false);
  const fadeDoneRef = useRef(false);
  const bgStartedRef = useRef(false);
  const scrollYRef = useRef(0);
  // Set the instant a leave is requested so a single press can't fire it twice (pointerup + the
  // synthetic click that follows) and jump two history entries back. Reset on each (re-)enter.
  const leaveStartedRef = useRef(false);

  // Lock page scroll while the game covers the screen; restore scroll otherwise. Stay unlocked for the
  // beats where the header itself fades (in-site going in, out-site coming back), not just "site": body
  // `overflow: hidden` breaks the nav's `position: sticky`, so otherwise the header would unpin from the
  // top (scrolled out of view) and the content→header→game staging wouldn't be visible. The lock holds
  // while the game backdrop covers the screen (in-fade through out-fade) and lifts again at out-site.
  useEffect(() => {
    if (stage === "site" || stage === "in-site" || stage === "out-site") {
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
  const startEnter = useCallback((instant = false) => {
    if (stage !== "site") return;
    scrollYRef.current = window.scrollY;
    gameReadyRef.current = false;
    fadeDoneRef.current = false;
    bgStartedRef.current = false;
    leaveStartedRef.current = false; // arm the Leave button again for this visit
    // `instant` (browser Back/Forward, incl. the mobile back-swipe) jumps straight to the game with
    // no staged fade — the same path reduced-motion takes.
    if (reduceMotion || instant) { setGameOn(true); setStage("game"); return; }
    setGameOn(false);   // the game backdrop stays hidden through in-site, then fades up at in-fade
    setStage("in-site"); // first beat: content → header fade out on their own, before the game appears
  }, [stage, reduceMotion]);

  const enterGame = useCallback(() => {
    if (stage !== "site") return;
    // Push a marked history entry (preserving Next's router state) with no URL change, so the
    // browser/device Back button leaves the museum and Forward walks back in — invisibly, and
    // clear of the #slug popup deep-link system.
    window.history.pushState({ ...window.history.state, museum: true }, "");
    startEnter();
  }, [stage, startEnter]);

  const exitGame = useCallback((instant = false) => {
    if (stage === "site" || stage.startsWith("out")) return; // already on the site, or already leaving
    if (reduceMotion || instant) { setGameOn(false); setStage("site"); return; }
    setStage("out-hud");
  }, [stage, reduceMotion]);

  // The in-game Leave button goes through history.back() so it shares one path with the Back
  // button and the history stack stays consistent (and Forward can still re-enter afterwards).
  // It flags the Back as button-initiated so the staged leave animation still plays for it, while a
  // browser/device Back — including the mobile back-swipe — leaves instantly (no animation, and none
  // of the staged-fade timers that a mid-swipe interruption could crash on).
  const leaveAnimatedRef = useRef(false);
  const requestExitGame = useCallback(() => {
    if (leaveStartedRef.current || stage !== "game") return;
    leaveStartedRef.current = true;
    leaveAnimatedRef.current = true;
    window.history.back();
  }, [stage]);

  // Back/Forward across the museum entry → leave / re-enter the game. Direction comes from the
  // entry's own state: landing on the museum-marked entry enters, landing off it leaves. Each
  // call no-ops via its own stage guard when it doesn't apply (e.g. popup-hash navigation).
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (e.state?.museum) {
        startEnter(true); // forward / re-enter via browser nav → instant
      } else {
        const animate = leaveAnimatedRef.current; // set only by our in-app Leave button
        leaveAnimatedRef.current = false;
        exitGame(!animate); // back-swipe / Back button → instant; Leave button → staged fade
      }
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
    const sync = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      // A hash that points to a real on-page section is in-page navigation (a header nav anchor like
      // #skills, whose id collides with the Skills exhibit slug) — scroll there, never open a popup.
      if (slug && document.getElementById(slug)) { setActivePopup(null); return; }
      setActivePopup(getPopupBySlug(slug));
    };
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
    const goTo = content.palette.groups.goTo;
    // "Go to" labels reuse the section titles (content.sections.*.title) so they can't drift.
    const sections: Command[] = [
      { id: "s-top", label: content.palette.commands.home, group: goTo, keywords: "top hero intro start", run: scrollTo("top") },
      { id: "s-work", label: content.sections.work.title, group: goTo, keywords: "projects portfolio", run: scrollTo("work") },
      { id: "s-exp", label: content.sections.experience.title, group: goTo, keywords: "work jobs", run: scrollTo("experience") },
      { id: "s-skills", label: content.sections.skills.title, group: goTo, keywords: "tech stack", run: scrollTo("skills") },
      { id: "s-cp", label: content.sections.competitive.title, group: goTo, keywords: "leetcode dmoj problems grind", run: scrollTo("competitive") },
      { id: "s-about", label: content.sections.about.title, group: goTo, keywords: "bio me", run: scrollTo("about") },
      { id: "s-contact", label: content.sections.contact.title, group: goTo, keywords: "email reach", run: scrollTo("contact") },
    ];
    const projects: Command[] = [...mainHallExhibits, ...archiveExhibits]
      .filter((e) => e.popup?.title)
      .map((e) => ({ id: "p-" + (slugForPopup(e.popup!) ?? e.popup!.title!), label: e.popup!.title!, group: content.palette.groups.projects, run: () => openPopup(e.popup!) }));
    const { actions: actionsGroup } = content.palette.groups;
    const { hints, commands } = content.palette;
    const actions: Command[] = [
      { id: "enter", label: commands.enter, group: actionsGroup, hint: hints.game, keywords: "play explore pixel", run: () => enterGame() },
      { id: "resume", label: commands.resume, group: actionsGroup, hint: hints.doc, keywords: "cv resume résumé", run: () => openPopup({ type: "resume" }) },
      { id: "transcript", label: commands.transcript, group: actionsGroup, hint: hints.doc, keywords: "school waterloo grades", run: () => openPopup({ type: "transcript" }) },
      { id: "email", label: commands.copyEmail, group: actionsGroup, hint: hints.contact, keywords: "mail reach", run: () => navigator.clipboard?.writeText(email) },
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
      // Site fades out on its own first (content leads, header trails) while the game is still hidden,
      // so the header reads as a distinct beat before the room appears. Long enough for the trailing
      // header to finish: one fade plus the header's lag.
      case "in-site":    return next("in-fade", HEADER_LAG + FADE_MS);
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
      // Game backdrop fades out to bare parchment, then the site fades back in as its own beat (header
      // leads, content trails) — the mirror of in-site, so the header reads as a distinct return beat.
      case "out-fade":   return next("out-site");
      case "out-site":   return next("site", HEADER_LAG + FADE_MS);
    }
  }, [stage, maybeStartBg]);

  // Derived view state
  const gameMounted = stage !== "site";
  const fadeMs = reduceMotion ? 0 : FADE_MS;
  // Stage the header as its own beat in the game transition: the change reads content → header → game
  // going in, and game → header → content coming back. The nav and the main content target the same
  // opacity (shown on the plain site and during the out-fade cross-fade), but with a stagger — heading
  // into the game the content leads and the header trails; coming back the header leads and the content
  // trails. Opacity lives on the nav/content themselves (not an ancestor) so the nav's backdrop-filter
  // keeps compositing through the fade.
  const siteShown = stage === "site" || stage === "out-site";
  const enteringGame = stage.startsWith("in") || stage === "game";
  const headerLag = reduceMotion ? 0 : HEADER_LAG;
  const navStyle = {
    opacity: siteShown && !introHidden ? 1 : 0,
    transition: `opacity ${fadeMs}ms ease ${enteringGame ? headerLag : 0}ms`,
  };
  const contentStyle = {
    opacity: siteShown && !introHidden ? 1 : 0,
    transition: `opacity ${fadeMs}ms ease ${enteringGame ? 0 : headerLag}ms`,
  };
  const worldOpacity =
    stage === "in-bg" || stage === "in-player" || stage === "game" || stage === "out-hud" || stage === "out-player" ? 1 : 0;
  const playerVisible = stage === "in-player" || stage === "game" || stage === "out-hud";
  const hudOpacity = stage === "game" ? 1 : 0;
  const audible = !stage.startsWith("out"); // fade music out across the leave stages
  const leaving = stage.startsWith("out");  // an open exhibit popup fades out first as we leave

  return (
    <>
      {/* Water surface behind everything — ripples on tap/click, flows as you move/drag. */}
      <WaterBackground />

      {/* Intro curtain — masks first paint, then lifts once web fonts are ready (not on a timer).
          The "lights coming up": warm lamp glow blooms, name + label + underline stage in. */}
      <IntroCurtain />

      {/* 3D glass-drop cinematic (first visit per session) — sits above the curtain, ends by firing
          the water ripple at viewport centre and revealing the page in the same beat. */}
      {cinematicOn && <IntroCinematic onDone={handleCinematicDone} />}

      {/* Site layer — plain flow (sticky nav + scroll unaffected). The header and content fade as
          separate beats (see navStyle/contentStyle) so the transition reads content → header → game. */}
      <div
        aria-hidden={stage !== "site"}
        style={{ pointerEvents: stage === "site" ? undefined : "none" }}
      >
        <Portfolio
          navStyle={navStyle}
          contentStyle={contentStyle}
          onEnter={enterGame}
          onResume={() => openPopup({ type: "resume" })}
          onTranscript={() => openPopup({ type: "transcript" })}
          onOpenProject={openPopup}
          currentStatus={currentStatus}
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
        <PressButton
          onClick={requestExitGame}
          aria-label="Leave the museum and return to the website"
          className="game-warm fixed left-1/2 z-60 -translate-x-1/2 rounded-full border border-[rgba(122,158,126,0.6)] bg-[rgba(254,249,236,0.92)] px-5 py-2 font-mono text-[13px] text-walnut shadow-[0_4px_20px_rgba(28,21,8,0.35)] backdrop-blur transition-colors hover:bg-[rgba(234,229,216,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          ← web
        </PressButton>
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
