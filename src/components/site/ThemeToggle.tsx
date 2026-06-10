"use client";

import { useDarkMode, setDarkMode } from "@/lib/use-dark-mode";

export default function ThemeToggle() {
  const dark = useDarkMode();
  return (
    <button
      onClick={() => setDarkMode(!dark)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--c-line-rgb)_/_0.15)] text-[13px] text-walnut/60 transition-colors hover:border-[rgba(122,158,126,0.5)] hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
