// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TouchControlsProps {
  visible: boolean;
  /** True when the player is next to an interactable — highlights the E button. */
  nearby: boolean;
  /** Analog move vector, each axis in [-1, 1]; (0, 0) means released/idle. */
  onMove: (x: number, y: number) => void;
  /** Fire an interaction (same as pressing E near a pedestal). */
  onInteract: () => void;
}

const BASE_SIZE = 132;            // px diameter of the joystick base
const NUB_SIZE = 60;
const RADIUS = BASE_SIZE / 2;
const RUN_THRESHOLD = 0.92;       // push to the rim to sprint (visual cue only)

export default function TouchControls({ visible, nearby, onMove, onInteract }: TouchControlsProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<{ x: number; y: number } | null>(null);
  const [nub, setNub] = useState({ x: 0, y: 0 });
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    onMove(0, 0);
    setNub({ x: 0, y: 0 });
    setRunning(false);
    setDragging(false);
    centerRef.current = null;
  }, [onMove]);

  // Stop movement when hidden (popup / map / loading). External sync only — no setState.
  useEffect(() => {
    if (!visible) onMove(0, 0);
  }, [visible, onMove]);

  // Reset the joystick visuals on the hide transition (render-time pattern; the
  // component returns null while hidden, so state is clean for the next show).
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) { setNub({ x: 0, y: 0 }); setRunning(false); setDragging(false); }
  }

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const c = centerRef.current;
    if (!c) return;
    let dx = clientX - c.x;
    let dy = clientY - c.y;
    const mag = Math.hypot(dx, dy);
    const clamped = Math.min(mag, RADIUS);
    if (mag > 0) { dx = (dx / mag) * clamped; dy = (dy / mag) * clamped; }
    setNub({ x: dx, y: dy });
    setRunning(clamped / RADIUS > RUN_THRESHOLD);
    onMove(dx / RADIUS, dy / RADIUS); // normalized vector, magnitude 0..1
  }, [onMove]);

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = baseRef.current!.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    handleMove(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (centerRef.current) handleMove(e.clientX, e.clientY);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-30 select-none"
      style={{ pointerEvents: "none", touchAction: "none" }}
    >
      {/* Joystick (bottom-left) */}
      <div
        ref={baseRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={reset}
        onPointerCancel={reset}
        className="absolute rounded-full border backdrop-blur-sm transition-colors"
        style={{
          width: BASE_SIZE,
          height: BASE_SIZE,
          left: "calc(env(safe-area-inset-left, 0px) + 28px)",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)",
          pointerEvents: "auto",
          touchAction: "none",
          background: "rgba(254,249,236,0.10)",
          borderColor: running ? "rgba(240,217,138,0.9)" : "rgba(122,158,126,0.55)",
          boxShadow: "0 4px 24px rgba(28,21,8,0.35)",
        }}
      >
        {/* Nub */}
        <div
          className="absolute rounded-full"
          style={{
            width: NUB_SIZE,
            height: NUB_SIZE,
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${nub.x}px), calc(-50% + ${nub.y}px))`,
            transition: dragging ? "none" : "transform 120ms ease-out",
            background: running ? "rgba(240,217,138,0.85)" : "rgba(122,158,126,0.8)",
            boxShadow: "0 2px 10px rgba(28,21,8,0.45), inset 0 1px 2px rgba(255,255,255,0.3)",
          }}
        />
      </div>

      {/* Interact button (bottom-right) */}
      <button
        type="button"
        aria-label="Interact"
        onPointerDown={(e) => { e.preventDefault(); onInteract(); }}
        className={`absolute flex flex-col items-center justify-center rounded-full border font-mono transition-[transform,border-color] duration-200 active:scale-95 ${nearby ? "interact-glow" : ""}`}
        style={{
          width: 84,
          height: 84,
          right: "calc(env(safe-area-inset-right, 0px) + 28px)",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 44px)",
          pointerEvents: "auto",
          touchAction: "none",
          // Fill + text stay constant; only the border brightens and the halo
          // (the .interact-glow box-shadow animation) appears when near an exhibit.
          background: "rgba(254,249,236,0.14)",
          borderColor: nearby ? "rgba(240,206,120,0.95)" : "rgba(254,249,236,0.35)",
          color: "rgba(254,249,236,0.9)",
          boxShadow: nearby ? undefined : "0 6px 18px rgba(28,21,8,0.35)",
          backdropFilter: "blur(3px)",
        }}
      >
        <span style={{ fontSize: 25, fontWeight: 700, lineHeight: 1 }}>E</span>
        <span style={{ fontSize: 9.5, letterSpacing: "0.14em", marginTop: 3, opacity: 0.65 }}>
          INSPECT
        </span>
      </button>
    </div>
  );
}
