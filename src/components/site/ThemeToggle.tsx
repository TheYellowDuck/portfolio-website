"use client";

import { useDarkMode, setDarkMode } from "@/lib/use-dark-mode";

export default function ThemeToggle() {
  const dark = useDarkMode();
  return (
    <button
      onClick={() => setDarkMode(!dark)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--c-line-rgb)_/_0.15)] text-walnut/60 transition-colors hover:border-[rgba(122,158,126,0.5)] hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
    >
      {/* Inline SVGs — the ☀/☾ characters render as colored (yellow) emoji on mobile;
          these inherit currentColor so the button stays monochrome everywhere. */}
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M19.4 4.6 18 6M6 18l-1.4 1.4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
