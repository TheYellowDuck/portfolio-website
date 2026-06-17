"use client";

import { useRef } from "react";
import PixelCharacter from "./PixelCharacter";
import { PERSON, LINKS } from "@/lib/site";

interface HeroProps {
  /** rect = the doorway panel's screen box, so the portal can zoom from it. */
  onEnter: (rect?: DOMRect) => void;
  onResume: () => void;
  /** "Currently:" line — server-derived role or academic term (see app/page.tsx). */
  currentStatus?: string;
}

const QUICK_LINKS = [
  { label: "GitHub", url: LINKS.github },
  { label: "LinkedIn", url: LINKS.linkedin },
  { label: "Email", url: LINKS.email },
];

export default function Hero({ onEnter, onResume, currentStatus }: HeroProps) {
  const doorRef = useRef<HTMLDivElement>(null);
  return (
    <header className="mx-auto flex min-h-[88svh] max-w-[1080px] flex-col justify-center gap-12 px-6 py-20 md:flex-row md:items-center md:gap-16">
      {/* Left: identity */}
      <div className="flex-1">
        <p className="font-mono text-[12px] uppercase tracking-[0.32em] text-pine">
          Portfolio · est. golden hour
        </p>
        <h1 className="mt-4 font-display text-[clamp(44px,8vw,72px)] font-semibold leading-[1.04] tracking-tight text-walnut">
          {PERSON.name}
        </h1>
        <p className="mt-4 max-w-[42ch] font-sans text-[18px] leading-relaxed dark:leading-[1.72] text-walnut/75">
          CS at the University of Waterloo, building thoughtful software — from
          Android Automotive at Ford to computer-vision rehab tools and a few too
          many games.
        </p>
        {currentStatus && (
          <p className="mt-2 font-mono text-[13px] text-walnut/55">
            Currently: {currentStatus}
          </p>
        )}

        <nav className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[13px]">
          <button
            onClick={onResume}
            className="text-pine underline decoration-sage/40 underline-offset-4 transition-colors hover:decoration-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
          >
            Resume
          </button>
          {QUICK_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.url}
              target={l.url.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="text-walnut/75 underline decoration-transparent underline-offset-4 transition-colors hover:text-pine hover:decoration-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 rounded-sm"
            >
              {l.label} ↗
            </a>
          ))}
        </nav>
      </div>

      {/* Right: the doorway portal into the game */}
      <div className="flex flex-1 flex-col items-center md:items-end">
        <button
          onClick={() => onEnter(doorRef.current?.getBoundingClientRect())}
          className="group relative w-full max-w-[360px] focus-visible:outline-none"
        >
          <div
            ref={doorRef}
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
              <PixelCharacter state="idle" dir="south" size={132} />
            </div>
            {/* Invitation */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pb-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[rgba(240,228,196,0.6)]">
                The museum
              </span>
              <span className="font-mono text-[15px] text-[rgba(240,228,196,0.95)] transition-colors group-hover:text-[#f0ce78]">
                Step inside →
              </span>
            </div>
          </div>
        </button>
        <p className="mt-3 w-full max-w-[360px] text-center font-mono text-[12px] text-walnut/70 md:text-right">
          an explorable, pixel-art version
        </p>
      </div>
    </header>
  );
}
