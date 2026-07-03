// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import type { ReactElement } from "react";

// The site mark: the museum's doorway, lit — a warm archway glowing out of a
// deeper, atmospheric exterior (the "step inside" portal the whole site is built
// around). Two palettes that swap with the colour scheme: dusk in light mode,
// sage in dark mode. Drawn as a vector (embedded SVG) so it stays sharp from the
// 512 PWA icon down to a 16px tab favicon.

interface Palette {
  tile: string;       // exterior tile (CSS background)
  glow: string;       // light spilling from the doorway (rgba)
  archTop: string;    // doorway light, top
  archBottom: string; // doorway light, threshold (brighter)
}

export const PALETTES = {
  // Sage & gold — deep botanical green with a warm honey doorway (dark mode).
  sage: { tile: "linear-gradient(160deg, #486a51 0%, #284639 100%)", glow: "rgba(246,200,110,0.42)", archTop: "#ffe7ac", archBottom: "#f3bf63" },
  // Golden-hour — dusk violet → rose → amber with a cream-gold doorway (light mode).
  dusk: { tile: "linear-gradient(165deg, #574a78 0%, #b86a6e 56%, #e7a35e 100%)", glow: "rgba(255,226,170,0.45)", archTop: "#ffeac6", archBottom: "#f6c879" },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

const doorwaySvg = (p: Palette) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.archTop}"/><stop offset="1" stop-color="${p.archBottom}"/></linearGradient></defs><path d="M23 87 L23 41 A27 27 0 0 1 77 41 L77 87 Z" fill="url(#d)"/></svg>`;

interface MarkOptions {
  /** Which colour story to paint. */
  palette?: PaletteName;
  /** Rounded tile (favicon / web app icon). Off for the iOS icon, which masks itself. */
  rounded?: boolean;
}

export function iconMark(size: number, { palette = "sage", rounded = true }: MarkOptions = {}): ReactElement {
  const p = PALETTES[palette];
  const art = Buffer.from(doorwaySvg(p)).toString("base64");
  const mark = Math.round(size * 0.78);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: rounded ? Math.round(size * 0.225) : 0,
        background: p.tile,
      }}
    >
      {/* warm light spilling from the doorway */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `radial-gradient(50% 46% at 50% 60%, ${p.glow} 0%, rgba(0,0,0,0) 70%)`,
        }}
      />
      {/* the glowing doorway */}
      <div
        style={{
          width: mark,
          height: mark,
          backgroundImage: `url(data:image/svg+xml;base64,${art})`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}
