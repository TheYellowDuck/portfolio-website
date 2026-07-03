// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

export const TILES = {
  FLOOR:       0,
  WALL:        1,
  PAINTING:    2,  // defined but not currently placed on the map — reserved for future wall art
  DOOR:        3,
  LOBBY:       10, // kept for compat; no longer assigned to a branch — do not reuse ID 10
  MAIN_HALL:   11,
  SKILLS_WING: 12,
  ARCHIVE:     13,
  OFFICE:      14,
  GIFT_SHOP:   15,
  EASTER_EGG:  16,
  VOID:        17, // outside museum bounds — not rendered, treated as solid
  EXPERIENCE:  18,
  RESUME:      19, // standalone hallway pedestal (resume / CV)
} as const;
