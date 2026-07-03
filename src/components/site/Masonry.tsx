// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

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
  /**
   * Optional per-item height estimate. When given, items pack greedily into the shortest
   * column (instead of round-robin) so the columns end near the same height — no exposed
   * gap/"seam" beside a card even when some items are much taller (e.g. ones with a video).
   */
  weights?: number[];
  base?: number; // columns below 640px
  sm?: number;   // ≥ 640px
  lg?: number;   // ≥ 1024px
}

/**
 * Masonry over responsive flex columns (plain flex, not CSS multi-column, so card hover
 * transforms don't repaint-flicker). With `weights` it balances columns by greedily adding
 * each item to the currently-shortest column; otherwise round-robin (item i → col i%cols).
 * Hydration-safe: server renders the base column count, client corrects after mount (hidden
 * by the Reveal fade so there's no visible reflow).
 */
export default function Masonry({ items, weights, base = 1, sm = 2, lg = 3 }: MasonryProps) {
  const cols = useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(Q_LG).matches ? lg : window.matchMedia(Q_SM).matches ? sm : base),
    () => base,
  );

  const columns: React.ReactNode[][] = Array.from({ length: cols }, () => []);
  if (weights && weights.length === items.length && cols > 1) {
    const heights = new Array<number>(cols).fill(0);
    items.forEach((item, i) => {
      let c = 0;
      for (let k = 1; k < cols; k++) if (heights[k] < heights[c]) c = k;
      columns[c].push(item);
      heights[c] += weights[i] || 1;
    });
  } else {
    items.forEach((item, i) => columns[i % cols].push(item));
  }

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
