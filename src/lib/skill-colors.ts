// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

// One source of truth for skill colours, keyed on CATEGORY so colour carries meaning: every skill in
// a group shares that group's colour, and a skill keeps that colour wherever it appears (the Skills
// wing, project cards, the Archive, Work experience, exhibit popups). The hue is a stable hash of the
// category NAME, so the same category is always the same colour; lightness/saturation are fixed to the
// site's muted palette. Skills that belong to no category fall back to a neutral grey.
import { skillCategoryMap } from "@/data/projects";

function hueFor(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (Math.imul(h, 31) + label.charCodeAt(i)) >>> 0;
  return h % 360;
}

function fromHue(hue: number) {
  return {
    hue,
    solid: `hsl(${hue} 40% 42%)`,            // chip / label text on light surfaces
    solidDark: `hsl(${hue} 58% 72%)`,        // chip / label text on dark surfaces
    border: `hsla(${hue}, 44%, 50%, 0.5)`,
    bg: `hsla(${hue}, 48%, 56%, 0.13)`,
    glow: `hsla(${hue}, 50%, 50%, 0.26)`,
  };
}

// Muted, theme-friendly grey for skills with no known category.
const NEUTRAL = {
  hue: 40,
  solid: "hsl(35 8% 44%)",
  solidDark: "hsl(40 10% 66%)",
  border: "hsla(36, 10%, 50%, 0.4)",
  bg: "hsla(38, 12%, 55%, 0.1)",
  glow: "hsla(38, 12%, 50%, 0.2)",
};

// Colour a CATEGORY (skill group) by its name. Use this where the category is known (the Skills wing
// orbs, exhibit-popup group headers/chips) so a group and all its pills share one colour.
export function categoryColor(category: string) {
  return fromHue(hueFor(category));
}

// Colour a bare skill/tech label by the category it belongs to (so colour = meaning). Used on cards
// that show a flat tech list with no group context. Unknown labels render neutral grey.
export function skillColorFor(label: string) {
  const category = skillCategoryMap[label];
  return category ? categoryColor(category) : NEUTRAL;
}
