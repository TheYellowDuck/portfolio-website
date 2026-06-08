/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";

export type Dir =
  | "east" | "west" | "north" | "south"
  | "north-east" | "north-west" | "south-east" | "south-west";

const FRAME_COUNT = { idle: 5, walk: 6 } as const;
const FPS = { idle: 6, walk: 10 } as const;

function frameSrc(state: "idle" | "walk", dir: Dir, i: number) {
  return `/assets/sprites/character/states/standing/animations/${state}/${dir}/frame_${String(i).padStart(3, "0")}.png`;
}

interface PixelCharacterProps {
  state?: "idle" | "walk";
  dir?: Dir;
  size?: number;
  /** Stop animating (hold frame 0). */
  paused?: boolean;
  className?: string;
}

/**
 * Renders the game's pixel character as a DOM sprite. All frames are stacked and
 * preloaded (opacity-toggled) so cycling never flickers. Reused on the landing
 * (idle) and by the portal transition (walk). Honors prefers-reduced-motion.
 */
export default function PixelCharacter({
  state = "idle",
  dir = "south",
  size = 120,
  paused = false,
  className = "",
}: PixelCharacterProps) {
  const count = FRAME_COUNT[state];
  const [tick, setTick] = useState(0);
  const frame = tick % count; // derived, so changing state/count never lands out of range

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000 / FPS[state]);
    return () => clearInterval(id);
  }, [state, paused]);

  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      {Array.from({ length: count }).map((_, i) => (
        <img
          key={i}
          src={frameSrc(state, dir, i)}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: size,
            height: size,
            objectFit: "contain",
            imageRendering: "pixelated",
            opacity: i === frame ? 1 : 0,
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}
