// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

// One soft water "plip" — the site's single UI sound, played by the intro curtain's enter
// click/tap (a real user gesture, so autoplay policies never block it). Native Audio, NOT howler:
// howler ships only inside the lazy game chunk, and one sound isn't worth adding it to the main
// bundle. Callers ignore rejections — the water still reads visually.
let plipEl: HTMLAudioElement | null = null;

export function playPlip(): Promise<void> {
  plipEl ??= new Audio("/assets/audio/plip.mp3");
  plipEl.volume = 0.15; // soft — an accent under the water, not a foreground sound
  plipEl.currentTime = 0;
  return plipEl.play();
}
