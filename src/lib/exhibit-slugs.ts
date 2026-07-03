// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

// Deep-link slugs for exhibits. A slug in the URL hash (e.g. `/#minesweeper`)
// opens that exhibit's modal on load, and is shareable / bookmarkable.

import {
  mainHallExhibits,
  archiveExhibits,
  experienceExhibits,
  skillsExhibits,
  officeExhibits,
  giftShopExhibits,
  type ExhibitPopup,
} from "@/data/projects";

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const ALL_POPUPS: ExhibitPopup[] = [
  mainHallExhibits,
  archiveExhibits,
  experienceExhibits,
  skillsExhibits,
  officeExhibits,
  giftShopExhibits,
]
  .flat()
  .map((e) => e.popup)
  .filter((p): p is ExhibitPopup => !!p);

/** The URL slug for a popup, or null if it can't be deep-linked. */
export function slugForPopup(popup: ExhibitPopup): string | null {
  if (popup.type === "resume") return "resume";
  if (popup.type === "transcript") return "transcript";
  if (popup.title) return slugify(popup.title);
  return null;
}

/** Resolve a hash slug back to a popup (or null for nav anchors / unknown). */
export function getPopupBySlug(slug: string): ExhibitPopup | null {
  if (!slug) return null;
  if (slug === "resume") return { type: "resume" } as ExhibitPopup;
  if (slug === "transcript") return { type: "transcript" } as ExhibitPopup;
  for (const p of ALL_POPUPS) {
    if (p.title && slugify(p.title) === slug) return p;
  }
  return null;
}
