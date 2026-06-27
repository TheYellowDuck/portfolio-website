// Rotating palette for skill groups — shared by the Skills section (Portfolio) and
// the grouped-skills column in exhibit popups, so a category keeps its colour.
export const SKILL_GROUP_COLORS = [
  { bg: "rgba(122,158,126,0.12)", border: "rgba(122,158,126,0.5)", solid: "#5a8260" }, // sage green
  { bg: "rgba(107,138,174,0.12)", border: "rgba(107,138,174,0.5)", solid: "#5b7ba0" }, // dusty blue
  { bg: "rgba(185,130,90,0.12)",  border: "rgba(185,130,90,0.5)",  solid: "#a96a36" }, // terracotta
  { bg: "rgba(172,148,89,0.12)",  border: "rgba(172,148,89,0.5)",  solid: "#8f7434" }, // amber
  { bg: "rgba(148,115,160,0.12)", border: "rgba(148,115,160,0.5)", solid: "#7d5f8a" }, // mauve
];

// A DISTINCT colour per group — evenly-spaced muted hues, generated for any count so each
// skill group gets its own colour (no 5-way repetition). Kept low-saturation to match the
// site's earthy palette. Returns CSS colour strings for solid text, border, and soft fill.
export function skillGroupColor(i: number, n: number) {
  const hue = Math.round((i * 360) / Math.max(n, 1) + 18) % 360;
  return {
    solid: `hsl(${hue} 40% 42%)`,
    border: `hsla(${hue}, 44%, 50%, 0.55)`,
    bg: `hsla(${hue}, 48%, 56%, 0.13)`,
    glow: `hsla(${hue}, 50%, 50%, 0.28)`,
  };
}

// Stable colour from a label string (same tech → same colour everywhere) — used to tint the
// project cards' tech chips so the skill palette carries into the projects section too.
export function skillColorFor(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (Math.imul(h, 31) + label.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return {
    solid: `hsl(${hue} 40% 42%)`,
    border: `hsla(${hue}, 44%, 50%, 0.5)`,
    bg: `hsla(${hue}, 48%, 56%, 0.13)`,
    glow: `hsla(${hue}, 50%, 50%, 0.26)`,
  };
}
