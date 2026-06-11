"use client";

import { useSyncExternalStore } from "react";

const Q_SM = "(min-width: 640px)";
const Q_LG = "(min-width: 1024px)";

function subscribe(cb: () => void) {
  const mqs = [window.matchMedia(Q_SM), window.matchMedia(Q_LG)];
  mqs.forEach((mq) => mq.addEventListener("change", cb));
  return () => mqs.forEach((mq) => mq.removeEventListener("change", cb));
}

interface MasonryProps {
  items: React.ReactNode[];
  base?: number; // columns below 640px
  sm?: number;   // ≥ 640px
  lg?: number;   // ≥ 1024px
}

/**
 * Round-robin masonry: distributes items left-to-right across responsive columns
 * (item i → column i % cols), each a tight flex stack. Cards pack upward with no
 * row gaps and read in natural order. Uses plain flex columns — not CSS multi-
 * column — so card hover transforms don't repaint-flicker. Hydration-safe: server
 * renders the base column count, client corrects after mount (hidden by the
 * Reveal fade so there's no visible reflow).
 */
export default function Masonry({ items, base = 1, sm = 2, lg = 3 }: MasonryProps) {
  const cols = useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(Q_LG).matches ? lg : window.matchMedia(Q_SM).matches ? sm : base),
    () => base,
  );

  const columns: React.ReactNode[][] = Array.from({ length: cols }, () => []);
  items.forEach((item, i) => columns[i % cols].push(item));

  return (
    <div className="flex gap-4">
      {columns.map((col, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-4">
          {col}
        </div>
      ))}
    </div>
  );
}
