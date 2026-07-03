// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

// Poster (first frame) path for a self-hosted /videos/*.mp4. Posters are generated next to the
// videos under /videos/posters/ (locally + by the sync). Used as the <video poster> so the preview
// shows a real frame instead of a black rectangle when autoplay is blocked — e.g. on some mobile
// browsers (Xiaomi/MIUI) that don't honour muted autoplay.
export function videoPoster(videoUrl?: string): string | undefined {
  if (!videoUrl?.startsWith("/videos/")) return undefined;
  return videoUrl.replace("/videos/", "/videos/posters/").replace(/\.[^./]+$/, ".jpg");
}
