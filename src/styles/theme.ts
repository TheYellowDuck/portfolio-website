// Single source of truth for all colors used across the museum portfolio.
// Import COLORS wherever a hex/rgba value is needed — never hardcode colors elsewhere.

export const COLORS = {
  // ── World / canvas ────────────────────────────────────────────────────────
  CANVAS_BG:    "#1c1508",   // deep warm walnut — shows through VOID tiles
  FLOOR:        "#c9a87c",   // warm honey wood
  WALL:         "#ddd0b3",   // warm cream plaster
  DOOR:         "#7a4f2a",   // warm mahogany
  TILE_GRID:    "rgba(0,0,0,0.06)",

  // ── Objects / furniture ───────────────────────────────────────────────────
  PEDESTAL:     "#a07840",
  DISPLAY_CASE: "#b8d4b0",
  WOOD_DARK:    "#7a5030",   // bench + table share this
  PLANTER:      "#557a50",
  DESK:         "#6b4030",

  // ── Accent (soft sage green) ──────────────────────────────────────────────
  SAGE:             "#7a9e7e",
  SAGE_GLOW_FILL:   "rgba(122,158,126,0.12)",
  SAGE_GLOW_STROKE: "rgba(122,158,126,0.5)",

  // ── React overlay UI ──────────────────────────────────────────────────────
  BACKDROP:      "rgba(28,21,8,0.72)",

  PARCHMENT:     "#fef9ec",
  TEXT_DARK:     "#3a2e1e",
  TEXT_SAGE:     "#4a7a44",
  DIVIDER:       "rgba(58,46,30,0.15)",
  BTN_BORDER:    "rgba(58,46,30,0.25)",
  TAG_BG:        "rgba(122,158,126,0.15)",
  TAG_BORDER:    "rgba(122,158,126,0.5)",
  LINK_BG:       "rgba(122,158,126,0.15)",
  LINK_BORDER:   "rgba(122,158,126,0.55)",
  POPUP_SHADOW:  "rgba(28,21,8,0.35)",

  DIALOG_BG:     "rgba(254,249,236,0.95)",
  DIALOG_BORDER: "rgba(122,158,126,0.7)",
  DIALOG_SHADOW: "rgba(28,21,8,0.2)",
} as const;
