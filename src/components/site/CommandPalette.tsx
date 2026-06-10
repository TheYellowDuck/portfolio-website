"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface Command {
  id: string;
  label: string;
  hint?: string;       // right-aligned tag, e.g. "Project"
  keywords?: string;   // extra search terms
  run: () => void;
}

/**
 * ⌘K / Ctrl-K command palette. Opens on the shortcut or a `command-palette:open`
 * window event (so a nav button can trigger it too). Disabled while in the game.
 */
export default function CommandPalette({ commands, enabled = true }: { commands: Command[]; enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const openRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  const doOpen = useCallback(() => { openRef.current = true; setQuery(""); setSel(0); setOpen(true); }, []);
  const doClose = useCallback(() => { openRef.current = false; setOpen(false); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        if (!enabled) return;
        e.preventDefault();
        if (openRef.current) doClose(); else doOpen();
      }
    };
    const onOpen = () => { if (enabled) doOpen(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("command-palette:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("command-palette:open", onOpen);
    };
  }, [enabled, doOpen, doClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Clamp the selection at render time (results shrink as you type) — no effect needed.
  const selClamped = results.length ? Math.min(sel, results.length - 1) : 0;

  // Keep the highlighted row in view (DOM side-effect only, no state).
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-sel="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selClamped, results]);

  if (!open || !enabled) return null;

  const run = (c?: Command) => { if (c) { doClose(); c.run(); } };

  return (
    <div
      className="fixed inset-0 z-70 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="fixed inset-0 bg-[rgba(28,21,8,0.45)] backdrop-blur-sm" onClick={doClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[rgb(var(--c-line-rgb)_/_0.18)] bg-parchment shadow-[0_16px_60px_rgba(28,21,8,0.4)]">
        <input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel(Math.min(selClamped + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel(Math.max(selClamped - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); run(results[selClamped]); }
            else if (e.key === "Escape") { e.preventDefault(); doClose(); }
          }}
          placeholder="Jump to a project, section, résumé…"
          className="w-full border-b border-[rgb(var(--c-line-rgb)_/_0.12)] bg-transparent px-5 py-4 font-sans text-[15px] text-walnut placeholder:text-walnut/40 focus:outline-none"
        />
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2 [scrollbar-width:thin]">
          {results.length === 0 && (
            <p className="px-5 py-6 text-center font-mono text-[13px] text-walnut/45">No matches</p>
          )}
          {results.map((c, i) => (
            <button
              key={c.id}
              data-sel={i === selClamped}
              onClick={() => run(c)}
              onMouseMove={() => setSel(i)}
              className={`flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left text-[14px] transition-colors ${
                i === selClamped ? "bg-[rgba(122,158,126,0.16)] text-pine" : "text-walnut/80"
              }`}
            >
              <span>{c.label}</span>
              {c.hint && <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-walnut/40">{c.hint}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-[rgb(var(--c-line-rgb)_/_0.1)] px-5 py-2 font-mono text-[11px] text-walnut/40">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
