"use client";

import { motion, AnimatePresence } from "framer-motion";

interface NpcDialogProps {
  /** Current line, or null when no dialog is showing. */
  line: string | null;
  speaker?: string;
  /** True if there are more lines after this one. */
  hasNext: boolean;
  /** Advance to the next line (or close on the last). */
  onAdvance: () => void;
  /** On touch, sit above the joystick/interact controls so they stay reachable. */
  isTouch?: boolean;
}

export default function NpcDialog({ line, speaker = "George", hasNext, onAdvance, isTouch = false }: NpcDialogProps) {
  return (
    <AnimatePresence>
      {line !== null && (
        <motion.div
          key="npc-dialog"
          role="dialog"
          aria-label={`${speaker} says`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          // Gentle fade-out so the conversation drifts away when you walk off (the
          // snappy spring still plays on the way in).
          exit={{ opacity: 0, y: 14, transition: { duration: 0.55, ease: "easeOut" } }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          onClick={onAdvance}
          // Touch positioning (portrait: above the controls; landscape: in the low gap
          // between the joystick + interact button) lives in `.npc-dialog-touch`.
          className={`fixed left-1/2 z-50 -translate-x-1/2 cursor-pointer select-none rounded-2xl border-2 border-sage bg-parchment px-5 py-4 shadow-[0_8px_40px_rgba(28,21,8,0.35)] ${isTouch ? "npc-dialog-touch w-[min(560px,92vw)]" : "bottom-10 npc-dialog-desktop"}`}
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-pine">{speaker}</p>
          <p className="mt-1.5 font-sans text-[15px] leading-relaxed text-walnut">{line}</p>
          <p className="mt-2 text-right font-mono text-[11px] text-walnut/45">
            {hasNext ? "E · tap ▸" : "E · tap to close ✕"}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
