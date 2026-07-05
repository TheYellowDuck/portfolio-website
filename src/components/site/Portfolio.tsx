// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import {
  mainHallExhibits,
  inProgressExhibits,
  archiveExhibits,
  experienceExhibits,
  skillsExhibits,
  officeExhibits,
  giftShopExhibits,
  type Exhibit,
  type ExhibitPopup,
} from "@/data/projects";
import Hero from "./Hero";
import { PERSON } from "@/lib/site";
import { content } from "@/content";
import { skillColorFor } from "@/lib/skill-colors";
import { useDarkMode } from "@/lib/use-dark-mode";
import { useTilt } from "@/lib/use-tilt";
import Reveal from "./Reveal";
import Typewriter from "./Typewriter";
import ProjectCard from "./ProjectCard";
import ThemeToggle from "./ThemeToggle";
import Masonry from "./Masonry";
import SkillBlobs from "./SkillBlobs";
import ArchiveScroller from "./ArchiveScroller";
import CpStats from "@/components/CpStats";
import { useIsMac } from "@/lib/use-is-mac";
import { PressButton } from "@/components/PressButton";

interface PortfolioProps {
  onEnter: (rect?: DOMRect) => void;
  onResume: () => void;
  onTranscript: () => void;
  onOpenProject: (popup: ExhibitPopup) => void;
  /** Hero's "Currently:" line — server-derived (role or academic term); see app/page.tsx. */
  currentStatus?: string;
  /** Transition styles staged by SiteShell so the header and content fade as separate beats. */
  navStyle?: CSSProperties;
  contentStyle?: CSSProperties;
}

const pad = (n: number) => String(n).padStart(2, "0");
const withPopup = (xs: Exhibit[]) => xs.filter((e): e is Required<Pick<Exhibit, "popup">> & Exhibit => !!e.popup?.title);

// How many cards a grid shows before the "Show all" fold — fewer on mobile (1-column, so tall).
const MOBILE_Q = "(max-width: 639px)";
function useIsMobile() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(MOBILE_Q); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(MOBILE_Q).matches,
    () => false,
  );
}

// A quiet "Show all N →" / "Show less" toggle under a grid (N = the live total in that group).
function ShowAllToggle({ open, total, onClick }: { open: boolean; total: number; onClick: () => void }) {
  return (
    <div className="mt-8 flex justify-center">
      <PressButton
        onClick={onClick}
        className="rounded-full border border-[rgba(122,158,126,0.5)] bg-[rgba(122,158,126,0.1)] px-4 py-1.5 font-mono text-[12px] text-pine transition-colors hover:bg-[rgba(122,158,126,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
      >
        {open ? "Show less" : `Show all ${total} →`}
      </PressButton>
    </div>
  );
}

function Section({ id, eyebrow, title, intro, titleDuration, children }: {
  id: string; eyebrow: string; title: string; intro?: string; titleDuration?: number; children: React.ReactNode;
}) {
  // Every section header is a whisper-level 3D scene (title floats over eyebrow/intro) — the same
  // material as the hero identity, at furniture volume.
  const headTilt = useTilt<HTMLDivElement>({ max: 2 });
  // No scroll-mt: the section's own top padding (py-16/24) already clears the sticky nav when an
  // anchor jumps here, so adding scroll-margin on top of it left a large empty gap above the title.
  return (
    <section id={id} className="mx-auto max-w-[1080px] px-6 py-16 sm:py-24">
      <Reveal variant="fade" duration={titleDuration}>
        <div ref={headTilt}>
          <p data-depth="8" className="font-mono text-[12px] uppercase tracking-[0.3em] text-pine">{eyebrow}</p>
          <h2 data-depth="14" className="mt-3 font-display text-[28px] font-semibold tracking-tight text-walnut sm:text-[34px]">{title}</h2>
          {intro && <p data-depth="6" className="mt-3 max-w-[60ch] text-[15px] leading-relaxed dark:leading-[1.72] text-walnut/70">{intro}</p>}
        </div>
      </Reveal>
      <div className="mt-9 sm:mt-11">{children}</div>
    </section>
  );
}

export default function Portfolio({ onEnter, onResume, onTranscript, onOpenProject, currentStatus, navStyle, contentStyle }: PortfolioProps) {
  const isMac = useIsMac();
  const featured = withPopup(mainHallExhibits);
  const inProgress = withPopup(inProgressExhibits);
  const archive = withPopup(archiveExhibits);
  // Featured/in-progress show a clean top set, with the rest behind a "Show all" fold (nothing is
  // demoted to the archive — it's purely how many render before the fold). Fewer on mobile.
  const isMobile = useIsMobile();
  const cap = isMobile ? 3 : 5;
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [showAllProgress, setShowAllProgress] = useState(false);
  const shownFeatured = showAllFeatured ? featured : featured.slice(0, cap);
  const shownInProgress = showAllProgress ? inProgress : inProgress.slice(0, cap);
  // Height estimates for masonry balancing, so columns pack evenly (no exposed seam).
  // A project card with a demo/thumbnail (aspect-video) is ~twice the height of one without.
  const cardWeight = (popup: ExhibitPopup) => (popup.videoUrl || popup.embedUrl ? 2 : 1);
  const aboutText = officeExhibits.find((e) => e.popup?.title === "About Me")?.popup?.description;
  const interests = officeExhibits.find((e) => e.popup?.title === "Interests")?.popup?.description;
  const hasTranscript = officeExhibits.some((e) => e.popup?.type === "transcript");

  // No bg on the root — the html parchment + the WaterBackground canvas (fixed, -z-10) show through
  // behind the content (the body is transparent). Cards/sections keep their own opaque surfaces.
  return (
    <div className="min-h-[100svh] text-walnut">
      {/* Keyboard skip link — first focusable element, revealed on focus. */}
      <a
        href="#main-content"
        className="sr-only rounded-md border border-[rgba(122,158,126,0.6)] bg-parchment px-4 py-2 font-mono text-[13px] text-pine shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:outline-none focus:ring-2 focus:ring-sage/50"
      >
        Skip to content
      </a>
      {/* Slim sticky nav */}
      <nav style={navStyle} className="sticky top-0 z-20 border-b border-[rgb(var(--c-line-rgb)_/_0.08)] bg-[rgb(var(--c-bg-rgb)_/_0.82)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-4">
          <a href="#top" className="font-display text-[17px] font-semibold tracking-tight text-walnut">{PERSON.name}</a>
          <div className="theme-fade-inner hidden items-center gap-6 font-mono text-[13px] text-walnut/65 sm:flex">
            <a href="#work" className="transition-colors hover:text-pine">{content.nav.links.work}</a>
            <a href="#experience" className="transition-colors hover:text-pine">{content.nav.links.experience}</a>
            <a href="#skills" className="transition-colors hover:text-pine">{content.nav.links.skills}</a>
            <a href="#about" className="transition-colors hover:text-pine">{content.nav.links.about}</a>
            <a href="#contact" className="transition-colors hover:text-pine">{content.nav.links.contact}</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <PressButton
              onClick={() => window.dispatchEvent(new Event("command-palette:open"))}
              aria-label={content.nav.paletteAria}
              className="hidden items-center rounded-md border border-[rgb(var(--c-line-rgb)_/_0.15)] px-2 py-1 font-mono text-[11px] text-walnut/55 transition-colors hover:border-[rgba(122,158,126,0.5)] hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 sm:flex"
            >
              {isMac ? "⌘K" : "Ctrl K"}
            </PressButton>
            <PressButton
              onClick={() => onEnter()}
              className="rounded-full border border-[rgba(122,158,126,0.5)] bg-[rgba(122,158,126,0.12)] px-3.5 py-1.5 font-mono text-[12px] text-pine transition-colors hover:bg-[rgba(122,158,126,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
            >
              {content.nav.enter}
            </PressButton>
          </div>
        </div>
      </nav>

      <main id="main-content" tabIndex={-1} style={contentStyle} className="outline-none">
        <div id="top" />
        <Hero onEnter={onEnter} onResume={onResume} currentStatus={currentStatus} />

      {/* ── Work ── */}
      <Section id="work" eyebrow={content.sections.work.eyebrow} title={content.sections.work.title}
        intro={content.sections.work.intro} titleDuration={900}>
        <Masonry sm={2} lg={2} weights={shownFeatured.map((e) => cardWeight(e.popup as ExhibitPopup))} items={shownFeatured.map((e, i) => (
          <Reveal key={i} delay={(i % 2) * 70} variant="up" distance={44} duration={760}>
            <ProjectCard index={pad(i + 1)} popup={e.popup as ExhibitPopup} onOpen={() => onOpenProject(e.popup as ExhibitPopup)} />
          </Reveal>
        ))} />
        {featured.length > cap && (
          <ShowAllToggle open={showAllFeatured} total={featured.length} onClick={() => setShowAllFeatured((v) => !v)} />
        )}

        {inProgress.length > 0 && (
          <>
            {/* Current work — deliberately not ranked (no No. NN); see scripts/sync-github.mjs. */}
            <Reveal variant="fade"><h3 className="mt-24 font-mono text-[12px] uppercase tracking-[0.28em] text-walnut/70">{content.sections.work.inProgress}</h3></Reveal>
            <div className="mt-6">
              <Masonry sm={2} lg={2} weights={shownInProgress.map((e) => cardWeight(e.popup as ExhibitPopup))} items={shownInProgress.map((e, i) => (
                <Reveal key={i} delay={(i % 2) * 70} variant="up" distance={44} duration={760}>
                  <ProjectCard popup={e.popup as ExhibitPopup} inProgress onOpen={() => onOpenProject(e.popup as ExhibitPopup)} />
                </Reveal>
              ))} />
            </div>
            {inProgress.length > cap && (
              <ShowAllToggle open={showAllProgress} total={inProgress.length} onClick={() => setShowAllProgress((v) => !v)} />
            )}
          </>
        )}

        {archive.length > 0 && (
          <>
            {/* In-section divider. Sub-division gap = mt-24 (96px) = half the section-to-section
                gap (sections are py-24, so 96+96=192px between them). Visibly tighter than a full
                section break, but one consistent value to reuse for any in-section division. */}
            <Reveal variant="fade"><h3 className="mt-24 font-mono text-[12px] uppercase tracking-[0.28em] text-walnut/70">{content.sections.work.archive}</h3></Reveal>
            <Reveal>
              <div className="mt-6">
                <ArchiveScroller
                  onOpen={onOpenProject}
                  items={archive.map((e, i) => ({
                    popup: e.popup as ExhibitPopup,
                    index: pad(featured.length + i + 1),
                  }))}
                />
              </div>
            </Reveal>
          </>
        )}
      </Section>

      {/* ── Experience ── */}
      <Section id="experience" eyebrow={content.sections.experience.eyebrow} title={content.sections.experience.title}>
        <div className="relative ml-1 space-y-12 border-l border-[rgba(122,158,126,0.4)] pl-6 sm:pl-8">
          {experienceExhibits.map((e, i) =>
            e.popup ? <ExperienceItem key={i} popup={e.popup} onOpen={() => onOpenProject(e.popup!)} /> : null
          )}
        </div>
      </Section>

      {/* ── Skills ── */}
      <Section id="skills" eyebrow={content.sections.skills.eyebrow} title={content.sections.skills.title}>
        <SkillBlobs
          groups={skillsExhibits.flatMap((e) =>
            e.popup?.title ? [{ title: e.popup.title, description: e.popup.description, items: e.popup.tech ?? [] }] : [],
          )}
          note={content.sections.skills.note}
        />
      </Section>

      {/* ── Competitive Programming — live stats from LeetCode + DMOJ ── */}
      <Section id="competitive" eyebrow={content.sections.competitive.eyebrow} title={content.sections.competitive.title}
        intro={content.sections.competitive.intro}>
        <Reveal><CpStats /></Reveal>
      </Section>

      {/* ── About ── */}
      <Section id="about" eyebrow={content.sections.about.eyebrow} title={content.sections.about.title}>
        <div className="grid gap-8 sm:grid-cols-[1.5fr_1fr]">
          <Reveal>
            <Typewriter
              className="theme-fade-inner block whitespace-pre-wrap text-[15px] leading-relaxed dark:leading-[1.72] text-walnut/85"
              segments={[
                ...(aboutText ? [{ text: aboutText }] : []),
                ...(aboutText && interests ? [{ text: "\n\n" }] : []),
                ...(interests
                  ? [
                      { text: content.sections.about.offClock, className: "font-mono text-[12px] uppercase tracking-[0.2em] text-pine" },
                      { text: interests },
                    ]
                  : []),
              ]}
            />
          </Reveal>
          <Reveal delay={80}>
            <div className="flex flex-col gap-3">
              <PressButton onClick={onResume} className="rounded-lg border border-[rgba(122,158,126,0.5)] bg-[rgba(122,158,126,0.1)] px-4 py-3 text-left font-mono text-[13px] text-pine transition-colors hover:bg-[rgba(122,158,126,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50">
                {content.sections.about.resume}
              </PressButton>
              {hasTranscript && (
                <PressButton onClick={onTranscript} className="rounded-lg border border-[rgb(var(--c-line-rgb)_/_0.15)] px-4 py-3 text-left font-mono text-[13px] text-walnut/80 transition-colors hover:border-[rgba(122,158,126,0.5)] hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50">
                  {content.sections.about.transcript}
                </PressButton>
              )}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Contact ── */}
      <Section id="contact" eyebrow={content.sections.contact.eyebrow} title={content.sections.contact.title}>
        <div className="flex flex-wrap items-center gap-3">
          {giftShopExhibits.map((e, i) => {
            const link = e.popup?.links?.[0];
            if (!link) return null;
            const primary = link.url.startsWith("mailto:");
            return (
              <Reveal key={i} delay={i * 50}>
                <a
                  href={link.url}
                  target={link.url.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={
                    primary
                      ? "inline-flex items-center gap-2 rounded-full bg-pine px-5 py-2.5 font-mono text-[13px] text-parchment shadow-[0_4px_20px_rgba(28,21,8,0.22)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                      : "inline-flex items-center gap-2 rounded-full border border-[rgba(122,158,126,0.5)] px-5 py-2.5 font-mono text-[13px] text-pine transition-colors hover:bg-[rgba(122,158,126,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
                  }
                >
                  {e.popup?.title} {primary ? "→" : "↗"}
                </a>
              </Reveal>
            );
          })}
        </div>
      </Section>

      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-[1080px] px-6 pb-16 pt-8">
        <Reveal variant="fade">
          <div className="flex flex-col items-start justify-between gap-3 border-t border-[rgb(var(--c-line-rgb)_/_0.1)] pt-6 font-mono text-[12px] text-walnut/70 sm:flex-row sm:items-center">
            <span className="theme-fade-self">© {new Date().getFullYear()} {PERSON.name} · {content.footer.builtWith}</span>
            <PressButton onClick={() => onEnter()} className="text-pine/80 transition-colors hover:text-pine">
              {content.footer.wander}
            </PressButton>
          </div>
          <p className="mt-3 max-w-[68ch] font-mono text-[11px] leading-relaxed text-walnut/70">
            {content.footer.privacy}
          </p>
        </Reveal>
      </footer>
    </div>
  );
}

function ExperienceItem({ popup, onOpen }: { popup: ExhibitPopup; onOpen: () => void }) {
  const dark = useDarkMode();
  // Timeline rows lean gently too — wide surfaces shear fast, so keep it at a whisper.
  const itemTilt = useTilt<HTMLDivElement>({ max: 2.5 });
  const long = (popup.description?.length ?? 0) > 280;
  return (
    <Reveal variant="left" duration={850} distance={30}>
      <div ref={itemTilt} className="relative">
        <span className="absolute -left-[24.5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-sage bg-parchment sm:-left-[32.5px]" />
        {popup.date && <p data-depth="6" className="font-mono text-[12px] tracking-wide text-sage">{popup.date}</p>}
        <h3 data-depth="12" className="mt-1 font-display text-[19px] font-semibold text-pine">{popup.title}</h3>
        {popup.subtitle && <p data-depth="8" className="text-[14px] text-walnut/70">{popup.subtitle}</p>}
        {popup.description && (
          <p className={`mt-2.5 max-w-[68ch] text-[14px] leading-relaxed dark:leading-[1.72] text-walnut/80 ${long ? "line-clamp-4" : ""}`}>
            {popup.description}
          </p>
        )}
        {long && (
          <PressButton onClick={onOpen} data-cursor="Open" className="mt-1.5 font-mono text-[12px] text-pine underline decoration-sage/40 underline-offset-4 transition-colors hover:decoration-sage">
            Read more
          </PressButton>
        )}
        {popup.tech && popup.tech.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {popup.tech.slice(0, 10).map((t) => {
              const c = skillColorFor(t);
              return (
                <span key={t} className="rounded border px-2 py-0.5 font-mono text-[11px]" style={{ borderColor: c.border, background: c.bg, color: dark ? c.solidDark : c.solid }}>{t}</span>
              );
            })}
          </div>
        )}
        {popup.links && popup.links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {popup.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[13px] text-walnut/75 underline decoration-sage/40 underline-offset-4 transition-colors hover:text-pine hover:decoration-sage">{l.label} ↗</a>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
