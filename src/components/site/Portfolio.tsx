"use client";

import { useState } from "react";
import {
  mainHallExhibits,
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
import Reveal from "./Reveal";
import ProjectCard from "./ProjectCard";
import ThemeToggle from "./ThemeToggle";
import { SKILL_GROUP_COLORS } from "@/lib/skill-colors";
import Masonry from "./Masonry";
import CpStats from "@/components/CpStats";
import { useIsMac } from "@/lib/use-is-mac";

interface PortfolioProps {
  onEnter: (rect?: DOMRect) => void;
  onResume: () => void;
  onTranscript: () => void;
  onOpenProject: (popup: ExhibitPopup) => void;
  /** Hero's "Currently:" line — server-derived (role or academic term); see app/page.tsx. */
  currentStatus?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const withPopup = (xs: Exhibit[]) => xs.filter((e): e is Required<Pick<Exhibit, "popup">> & Exhibit => !!e.popup?.title);

function Section({ id, eyebrow, title, intro, children }: {
  id: string; eyebrow: string; title: string; intro?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-[1080px] scroll-mt-20 px-6 py-16 sm:py-24">
      <Reveal variant="fade">
        <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-pine">{eyebrow}</p>
        <h2 className="mt-3 font-display text-[28px] font-semibold tracking-tight text-walnut sm:text-[34px]">{title}</h2>
        {intro && <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed dark:leading-[1.72] text-walnut/70">{intro}</p>}
      </Reveal>
      <div className="mt-9 sm:mt-11">{children}</div>
    </section>
  );
}

export default function Portfolio({ onEnter, onResume, onTranscript, onOpenProject, currentStatus }: PortfolioProps) {
  const isMac = useIsMac();
  const featured = withPopup(mainHallExhibits);
  const archive = withPopup(archiveExhibits);
  // Height estimates for masonry balancing, so columns pack evenly (no exposed seam).
  // A project card with a demo/thumbnail (aspect-video) is ~twice the height of one without.
  const cardWeight = (popup: ExhibitPopup) => (popup.videoUrl || popup.embedUrl ? 2 : 1);
  // A skill card's height is driven by its pill count (≈ rows) plus title/description.
  const skillWeight = (popup: ExhibitPopup) =>
    1 + (popup.description ? 1.4 : 0) + Math.ceil((popup.tech?.length ?? 0) / 3.5) * 0.8;
  const aboutText = officeExhibits.find((e) => e.popup?.title === "About Me")?.popup?.description;
  const interests = officeExhibits.find((e) => e.popup?.title === "Interests")?.popup?.description;
  const hasTranscript = officeExhibits.some((e) => e.popup?.type === "transcript");

  return (
    <div className="min-h-[100svh] bg-parchment text-walnut">
      {/* Keyboard skip link — first focusable element, revealed on focus. */}
      <a
        href="#main-content"
        className="sr-only rounded-md border border-[rgba(122,158,126,0.6)] bg-parchment px-4 py-2 font-mono text-[13px] text-pine shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:outline-none focus:ring-2 focus:ring-sage/50"
      >
        Skip to content
      </a>
      {/* Slim sticky nav */}
      <nav className="sticky top-0 z-20 border-b border-[rgb(var(--c-line-rgb)_/_0.08)] bg-[rgb(var(--c-bg-rgb)_/_0.82)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-4">
          <a href="#top" className="font-display text-[17px] font-semibold tracking-tight text-walnut">{PERSON.name}</a>
          <div className="hidden items-center gap-6 font-mono text-[13px] text-walnut/65 sm:flex">
            <a href="#work" className="transition-colors hover:text-pine">{content.nav.links.work}</a>
            <a href="#experience" className="transition-colors hover:text-pine">{content.nav.links.experience}</a>
            <a href="#skills" className="transition-colors hover:text-pine">{content.nav.links.skills}</a>
            <a href="#contact" className="transition-colors hover:text-pine">{content.nav.links.contact}</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => window.dispatchEvent(new Event("command-palette:open"))}
              aria-label={content.nav.paletteAria}
              className="hidden items-center rounded-md border border-[rgb(var(--c-line-rgb)_/_0.15)] px-2 py-1 font-mono text-[11px] text-walnut/55 transition-colors hover:border-[rgba(122,158,126,0.5)] hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 sm:flex"
            >
              {isMac ? "⌘K" : "Ctrl K"}
            </button>
            <button
              onClick={() => onEnter()}
              className="rounded-full border border-[rgba(122,158,126,0.5)] bg-[rgba(122,158,126,0.12)] px-3.5 py-1.5 font-mono text-[12px] text-pine transition-colors hover:bg-[rgba(122,158,126,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
            >
              {content.nav.enter}
            </button>
          </div>
        </div>
      </nav>

      <main id="main-content" tabIndex={-1} className="outline-none">
        <div id="top" />
        <Hero onEnter={onEnter} onResume={onResume} currentStatus={currentStatus} />

      {/* ── Work ── */}
      <Section id="work" eyebrow={content.sections.work.eyebrow} title={content.sections.work.title}
        intro={content.sections.work.intro}>
        <Masonry sm={2} lg={2} weights={featured.map((e) => cardWeight(e.popup as ExhibitPopup))} items={featured.map((e, i) => (
          <Reveal key={i} delay={(i % 2) * 70}>
            <ProjectCard index={pad(i + 1)} popup={e.popup as ExhibitPopup} onOpen={() => onOpenProject(e.popup as ExhibitPopup)} />
          </Reveal>
        ))} />

        {archive.length > 0 && (
          <>
            {/* In-section divider. Sub-division gap = mt-24 (96px) = half the section-to-section
                gap (sections are py-24, so 96+96=192px between them). Visibly tighter than a full
                section break, but one consistent value to reuse for any in-section division. */}
            <h3 className="mt-24 font-mono text-[12px] uppercase tracking-[0.28em] text-walnut/70">{content.sections.work.archive}</h3>
            <div className="mt-6">
              <Masonry sm={2} lg={3} weights={archive.map((e) => cardWeight(e.popup as ExhibitPopup))} items={archive.map((e, i) => (
                <Reveal key={i} delay={(i % 3) * 60}>
                  <ProjectCard index={pad(featured.length + i + 1)} popup={e.popup as ExhibitPopup} compact onOpen={() => onOpenProject(e.popup as ExhibitPopup)} />
                </Reveal>
              ))} />
            </div>
          </>
        )}
      </Section>

      {/* ── Experience ── */}
      <Section id="experience" eyebrow={content.sections.experience.eyebrow} title={content.sections.experience.title}>
        <div className="relative ml-1 space-y-12 border-l border-[rgba(122,158,126,0.4)] pl-6 sm:pl-8">
          {experienceExhibits.map((e, i) =>
            e.popup ? <ExperienceItem key={i} popup={e.popup} /> : null
          )}
        </div>
      </Section>

      {/* ── Skills ── */}
      <Section id="skills" eyebrow={content.sections.skills.eyebrow} title={content.sections.skills.title}>
        <Masonry sm={2} lg={3} weights={skillsExhibits.filter((e) => e.popup).map((e) => skillWeight(e.popup as ExhibitPopup))} items={skillsExhibits.flatMap((e, i) => {
            if (!e.popup) return [];
            const c = SKILL_GROUP_COLORS[i % SKILL_GROUP_COLORS.length];
            return [(
              <Reveal key={i} delay={(i % 3) * 60}>
                <div className="rounded-xl border bg-surface p-5" style={{ borderColor: c.border }}>
                  <h3 className="font-display text-[16px] font-semibold" style={{ color: c.solid }}>{e.popup.title}</h3>
                  {e.popup.description && (
                    <p className="mt-1.5 text-[13px] leading-relaxed dark:leading-[1.72] text-walnut/70">{e.popup.description}</p>
                  )}
                  {e.popup.tech && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.popup.tech.map((t) => (
                        <span key={t} className="rounded border px-2 py-0.5 font-mono text-[11px] text-walnut/85" style={{ background: c.bg, borderColor: c.border }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            )];
          })} />
      </Section>

      {/* ── About ── */}
      <Section id="about" eyebrow={content.sections.about.eyebrow} title={content.sections.about.title}>
        <div className="grid gap-8 sm:grid-cols-[1.5fr_1fr]">
          <Reveal>
            <div className="space-y-4 text-[15px] leading-relaxed dark:leading-[1.72] text-walnut/85">
              {aboutText && <p>{aboutText}</p>}
              {interests && (
                <p><span className="font-mono text-[12px] uppercase tracking-[0.2em] text-pine">{content.sections.about.offClock}</span>{interests}</p>
              )}
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex flex-col gap-3">
              <button onClick={onResume} className="rounded-lg border border-[rgba(122,158,126,0.5)] bg-[rgba(122,158,126,0.1)] px-4 py-3 text-left font-mono text-[13px] text-pine transition-colors hover:bg-[rgba(122,158,126,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50">
                {content.sections.about.resume}
              </button>
              {hasTranscript && (
                <button onClick={onTranscript} className="rounded-lg border border-[rgb(var(--c-line-rgb)_/_0.15)] px-4 py-3 text-left font-mono text-[13px] text-walnut/80 transition-colors hover:border-[rgba(122,158,126,0.5)] hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50">
                  {content.sections.about.transcript}
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Competitive Programming — live stats from LeetCode + DMOJ ── */}
      <Section id="competitive" eyebrow={content.sections.competitive.eyebrow} title={content.sections.competitive.title}
        intro={content.sections.competitive.intro}>
        <Reveal><CpStats /></Reveal>
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
        <div className="flex flex-col items-start justify-between gap-3 border-t border-[rgb(var(--c-line-rgb)_/_0.1)] pt-6 font-mono text-[12px] text-walnut/70 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} {PERSON.name} · {content.footer.builtWith}</span>
          <button onClick={() => onEnter()} className="text-pine/80 transition-colors hover:text-pine">
            {content.footer.wander}
          </button>
        </div>
        <p className="mt-3 max-w-[68ch] font-mono text-[11px] leading-relaxed text-walnut/70">
          {content.footer.privacy}
        </p>
      </footer>
    </div>
  );
}

function ExperienceItem({ popup }: { popup: ExhibitPopup }) {
  const [open, setOpen] = useState(false);
  const long = (popup.description?.length ?? 0) > 280;
  return (
    <Reveal variant="left">
      <div className="relative">
        <span className="absolute -left-[24.5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-sage bg-parchment sm:-left-[32.5px]" />
        {popup.date && <p className="font-mono text-[12px] tracking-wide text-sage">{popup.date}</p>}
        <h3 className="mt-1 font-display text-[19px] font-semibold text-pine">{popup.title}</h3>
        {popup.subtitle && <p className="text-[14px] text-walnut/70">{popup.subtitle}</p>}
        {popup.description && (
          <p className={`mt-2.5 max-w-[68ch] text-[14px] leading-relaxed dark:leading-[1.72] text-walnut/80 ${long && !open ? "line-clamp-4" : ""}`}>
            {popup.description}
          </p>
        )}
        {long && (
          <button onClick={() => setOpen((o) => !o)} className="mt-1.5 font-mono text-[12px] text-pine underline decoration-sage/40 underline-offset-4 transition-colors hover:decoration-sage">
            {open ? "Show less" : "Read more"}
          </button>
        )}
        {popup.tech && popup.tech.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {popup.tech.slice(0, 10).map((t) => (
              <span key={t} className="rounded border border-[rgba(122,158,126,0.4)] bg-[rgba(122,158,126,0.1)] px-2 py-0.5 font-mono text-[11px] text-pine">{t}</span>
            ))}
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
