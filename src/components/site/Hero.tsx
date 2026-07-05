// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useRef } from "react";
import PixelCharacter from "./PixelCharacter";
import CausticLight from "./CausticLight";
import HeroOrb from "./HeroOrb";
import ScrambleText from "./ScrambleText";
import { PERSON, LINKS } from "@/lib/site";
import { content } from "@/content";
import { PressButton } from "@/components/PressButton";
import { useTilt } from "@/lib/use-tilt";

interface HeroProps {
  /** rect = the doorway panel's screen box, so the portal can zoom from it. */
  onEnter: (rect?: DOMRect) => void;
  onResume: () => void;
  /** "Currently:" line — server-derived role or academic term (see app/page.tsx). */
  currentStatus?: string;
}

const QUICK_LINKS = [
  { label: content.hero.links.github, url: LINKS.github },
  { label: content.hero.links.linkedin, url: LINKS.linkedin },
  { label: content.hero.links.email, url: LINKS.email },
];

export default function Hero({ onEnter, onResume, currentStatus }: HeroProps) {
  const doorRef = useRef<HTMLDivElement>(null);
  // The doorway leans toward the pointer like a display case under inspection (folds in the
  // group-hover -translate-y-1 the inline transform would otherwise override).
  const doorTilt = useTilt<HTMLDivElement>({ max: 6, lift: 4 });
  return (
    <header className="relative isolate mx-auto flex min-h-[88svh] max-w-[1080px] flex-col justify-center gap-12 px-6 py-20 md:flex-row md:items-center md:gap-16">
      {/* Caustic lamplight breathing across the parchment behind the hero — pure atmosphere,
          behind the content (-z-10 inside this header's isolated stacking context). */}
      <CausticLight className="absolute inset-0 -z-10" />
      {/* Left: identity */}
      <div className="flex-1">
        <p className="font-mono text-[12px] uppercase tracking-[0.32em] text-pine">
          <ScrambleText text={content.hero.eyebrow} delay={0} />
        </p>
        <h1 className="mt-4 font-display text-[clamp(44px,8vw,72px)] font-semibold leading-[1.04] tracking-tight text-walnut">
          <ScrambleText text={PERSON.name} delay={120} />
        </h1>
        <p className="mt-4 max-w-[42ch] font-sans text-[18px] leading-relaxed dark:leading-[1.72] text-walnut/75">
          <ScrambleText text={content.hero.tagline} delay={300} />
        </p>
        {currentStatus && (
          <p className="mt-2 font-mono text-[13px] text-walnut/55">
            <ScrambleText text={`${content.hero.currentlyLabel} ${currentStatus}`} delay={480} />
          </p>
        )}

        <nav className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[13px]">
          <PressButton
            onClick={onResume}
            className="text-pine underline decoration-sage/40 underline-offset-4 transition-colors hover:decoration-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
          >
            <ScrambleText text={content.hero.resume} delay={620} />
          </PressButton>
          {QUICK_LINKS.map((l, i) => (
            <a
              key={l.label}
              href={l.url}
              target={l.url.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="text-walnut/75 underline decoration-transparent underline-offset-4 transition-colors hover:text-pine hover:decoration-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
            >
              <ScrambleText text={l.label} delay={680 + i * 60} /> ↗
            </a>
          ))}
        </nav>
      </div>

      {/* Right: the doorway portal into the game */}
      <div className="relative flex flex-1 flex-col items-center md:items-end">
        {/* The intro's glass drop, settled by the doorway — gently bobbing, leaning toward the
            pointer. Decorative (pointer-events-none), so it never blocks the doorway click. */}
        <HeroOrb className="absolute -top-8 right-[8%] z-10 md:-top-10 md:right-[-14px]" />
        <PressButton
          onClick={() => onEnter(doorRef.current?.getBoundingClientRect())}
          data-cursor="Enter"
          className="group relative w-full max-w-[360px] focus-visible:outline-none"
        >
          <div
            ref={(el) => { doorRef.current = el; doorTilt(el); }}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] border border-[rgb(var(--c-line-rgb)_/_0.18)] shadow-[0_18px_50px_rgba(28,21,8,0.28)] transition-transform duration-300 group-hover:-translate-y-1"
            style={{ background: "radial-gradient(125% 90% at 50% 22%, #2c2310 0%, #1c1508 68%)" }}
          >
            {/* Lamplight spilling from above */}
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-2/3 w-2/3 -translate-x-1/2 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "radial-gradient(closest-side, rgba(240,206,120,0.40), transparent 75%)" }}
            />
            {/* Floor line */}
            <div className="absolute inset-x-6 bottom-[22%] h-px bg-[rgba(240,206,120,0.18)]" />
            {/* Character standing in the doorway */}
            <div aria-hidden className="absolute bottom-[18%] left-1/2 -translate-x-1/2 transition-transform duration-300 group-hover:scale-105">
              <PixelCharacter state="idle" dir="south" size={330} />
            </div>
            {/* Invitation */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pb-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[rgba(240,228,196,0.6)]">
                {content.hero.doorway.label}
              </span>
              <span className="font-mono text-[15px] text-[rgba(240,228,196,0.95)] transition-colors group-hover:text-[#f0ce78]">
                {content.hero.doorway.cta}
              </span>
            </div>
          </div>
        </PressButton>
        <p className="mt-3 w-full max-w-[360px] text-center font-mono text-[12px] text-walnut/70 md:text-right">
          {content.hero.doorway.caption}
        </p>
      </div>
    </header>
  );
}
