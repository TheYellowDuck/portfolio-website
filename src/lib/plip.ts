// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

// One soft water "plip" — the site's single UI sound, played by the intro curtain's enter
// click/tap. Web Audio, not an HTMLAudioElement: the media-element path put the whole pipeline
// (fetch → demux → decode → OS sink) between the gesture and the sound, which on Linux arrived
// audibly late. Instead the curtain PRIMES this while its loading state shows — fetch + decode
// into an AudioBuffer up front (the AudioContext may sit suspended until a gesture; decoding
// works regardless) — and the click merely resume()s and starts a buffer source: near-zero
// latency everywhere. Falls back to a preloaded HTMLAudio where Web Audio is unavailable.
// Not howler: it ships only inside the lazy game chunk, and one sound isn't worth the bundle.
const SRC = "/assets/audio/plip.mp3";
const VOLUME = 0.15; // soft — an accent under the water, not a foreground sound

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let fallback: HTMLAudioElement | null = null;
let primed = false;

/** Fetch + decode ahead of time (the curtain calls this on mount, long before the click). */
export function primePlip() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  try {
    const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      ctx = new AC();
      fetch(SRC)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx!.decodeAudioData(ab))
        .then((b) => { buffer = b; })
        .catch(() => { buffer = null; /* the HTMLAudio fallback below still works */ });
      return;
    }
  } catch { /* fall through to the media element */ }
  fallback = new Audio(SRC);
  fallback.preload = "auto";
  fallback.volume = VOLUME;
  fallback.load();
}

/** Play the drop. Callers ignore rejections — the water still reads visually. */
export function playPlip(): Promise<void> {
  if (ctx && buffer) {
    // resume() is inside the click gesture, so a suspended context unblocks immediately; the
    // source is scheduled in the same tick and sounds as soon as the context runs (~ms).
    if (ctx.state === "suspended") void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = VOLUME;
    src.connect(gain).connect(ctx.destination);
    src.start();
    return Promise.resolve();
  }
  fallback ??= (() => {
    const a = new Audio(SRC);
    a.volume = VOLUME;
    return a;
  })();
  fallback.currentTime = 0;
  return fallback.play();
}
