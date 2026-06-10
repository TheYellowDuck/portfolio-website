// localStorage-backed game preferences. Used only inside the (client-only)
// GameCanvas, so `localStorage` is always available.

const DISCOVERED_KEY = "museum:discovered";
const AUDIO_KEY = "museum:audio";

export function loadDiscovered(): Set<string> {
  try {
    const a = JSON.parse(localStorage.getItem(DISCOVERED_KEY) || "[]");
    return new Set(Array.isArray(a) ? (a as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveDiscovered(set: Set<string>) {
  try { localStorage.setItem(DISCOVERED_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

export interface AudioPrefs { music: number; sfx: number; }

const clamp01 = (n: unknown): number => (typeof n === "number" && n >= 0 && n <= 1 ? n : 1);

export function loadAudioPrefs(): AudioPrefs {
  try {
    const r = JSON.parse(localStorage.getItem(AUDIO_KEY) || "{}");
    return { music: clamp01(r.music), sfx: clamp01(r.sfx) };
  } catch {
    return { music: 1, sfx: 1 };
  }
}

export function saveAudioPrefs(p: AudioPrefs) {
  try { localStorage.setItem(AUDIO_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
