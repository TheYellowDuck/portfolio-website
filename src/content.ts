// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

/**
 * content.ts — every user-facing UI-chrome string in one place ("the strings file").
 *
 * WHAT LIVES HERE: the editorial copy that's otherwise scattered inline across the site shell —
 * hero, nav, section eyebrows/titles/intros, the doorway, footer, loading screen, 404, command
 * palette. Edit wording here once; the components below read it.
 *
 * ── i18n-ready ──────────────────────────────────────────────────────────────────────────────
 * `en` is the default (and currently only) dictionary. To add a language, define another object of
 * the same shape and select one — no call site changes, because they already read `content.*`:
 *     const fr: Content = { …same keys… };
 *     const dict = { en, fr };
 *     export const content = dict[locale];   // locale from cookie / Accept-Language / route segment
 * The `Content` type (derived from `en`) makes every translation prove it's complete.
 *
 * ── Dependency map: which file reads which keys ─────────────────────────────────────────────
 *   content.hero.*        → components/site/Hero.tsx
 *   content.hero.eyebrow  → ALSO components/site/IntroCurtain.tsx   (one key, two readers)
 *   content.nav.*         → components/site/Portfolio.tsx (sticky nav)
 *   content.sections.*    → components/site/Portfolio.tsx  (titles also reused by the palette below)
 *   content.footer.*      → components/site/Portfolio.tsx
 *   content.loading.*     → components/LoadingScreen.tsx
 *   content.notFound.*    → app/not-found.tsx
 *   content.palette.*     → components/site/CommandPalette.tsx (chrome) + SiteShell.tsx (command list)
 *   content.game.*        → components/GameCanvas.tsx  (in-game HUD; message passed to BottomHint)
 *
 * ── NOT here, and where it lives instead (this file's copy coexists with these sources) ──────
 *   • Exhibit copy (project titles/descriptions/tech/links, the About story, skills) → data/projects.ts
 *       Kept beside its structured data — splitting the prose from its tech/links would fragment it.
 *   • Identity facts (name, email, social URLs) + derived LINKS → lib/site.ts  [PERSON, LINKS]
 *   • SEO page title + description → lib/site.ts  [SITE_TITLE, SITE_DESCRIPTION]
 *   • The hero "Currently:" VALUE (role or academic term) → computed in app/page.tsx
 *       from projects.ts currentRole() + the parsed transcript.
 *   • classNames, event names ("command-palette:open"), storage keys ("museum:theme") → left inline;
 *       they're code contracts/styling, not content.
 */

const en = {
  hero: {
    eyebrow: "Portfolio · est. golden hour",
    tagline:
      "CS at the University of Waterloo, building thoughtful software — from Android Automotive at Ford to computer-vision rehab tools and a few too many games.",
    currentlyLabel: "Currently:",
    resume: "Resume",
    links: { github: "GitHub", linkedin: "LinkedIn", email: "Email" },
    doorway: { label: "The museum", cta: "Step inside →", caption: "an explorable, pixel-art version" },
  },
  nav: {
    links: { work: "Work", experience: "Experience", skills: "Skills", about: "About", contact: "Contact" },
    paletteAria: "Open command palette",
    enter: "Step inside →",
  },
  sections: {
    work: {
      eyebrow: "The Collection",
      title: "Selected Work",
      intro:
        "A few things I've built — games, tools, and research apps. Step inside the museum to see them on pedestals.",
      inProgress: "In progress",   // subsection heading for actively-built projects (pulled out of the ranking)
      inProgressTag: "In progress", // the pill shown on those cards in place of a No. NN index
      archive: "Archive",
    },
    experience: { eyebrow: "Curriculum Vitae", title: "Experience" },
    skills: { eyebrow: "The Toolkit", title: "Skills", note: "Tap a circle to open it. A skill's colour is its category — skills in the same group share one colour, and each keeps that colour everywhere it appears (Work, Projects, Archive). Skills outside these groups show in grey." },
    about: {
      eyebrow: "The Curator",
      title: "About",
      offClock: "Off the clock — ",
      resume: "Read résumé →",
      transcript: "Education & transcript →",
    },
    competitive: {
      eyebrow: "The Grind",
      title: "Competitive Programming",
      intro: "Problem-solving, pulled live from LeetCode and DMOJ.",
    },
    contact: { eyebrow: "Stay in touch", title: "Let's talk" },
  },
  footer: {
    builtWith: "built with Next.js",
    wander: "Prefer to wander? Step inside the museum →",
    privacy:
      "Inside the museum, your anonymous movement is briefly recorded so future visitors can watch it drift by as a glowing wisp. No accounts, no personal data — just footsteps.",
  },
  loading: { subtitle: "Personal Portfolio", loading: "loading…" },
  notFound: {
    code: "Error 404",
    title: "This exhibit isn't here",
    body: "The page you were looking for has been moved, retired, or never hung on these walls.",
    back: "← Back to the entrance",
  },
  palette: {
    aria: "Command palette",
    placeholder: "Jump to a project, section, résumé…",
    noMatches: "No matches",
    navigate: "↑↓ navigate",
    open: "↵ open",
    close: "esc close",
    // Command entries (built in SiteShell). NOTE: the "Go to" section jumps reuse sections.*.title
    // above — one source — so they can't drift from the section headers. Only the non-section
    // commands need their own labels here.
    groups: { goTo: "Go to", projects: "Projects", actions: "Actions" },
    hints: { game: "Game", doc: "Doc", contact: "Contact" },
    commands: {
      home: "Home",
      enter: "Step inside the museum",
      resume: "Open résumé",
      transcript: "Education & transcript",
      copyEmail: "Copy email address",
    },
  },
  // In-game HUD copy (the canvas museum) — a distinct voice from the site chrome, but kept in the same
  // dictionary so one translation covers the whole product. GameCanvas reads these and passes the
  // active one to BottomHint as its `message`.
  game: {
    promptTalk: "Press E to talk",
    promptInspect: "Press E to inspect",
    controlsTouch: "Drag to move · push to run · tap E to inspect",
    controlsKeyboard: "WASD to move · Shift to sprint",
  },
} as const;

/** Shape of one locale's copy — a future translation `const fr: Content = …` must match it exactly. */
export type Content = typeof en;

export const content: Content = en;
