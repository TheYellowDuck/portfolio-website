"use client";

import { motion, AnimatePresence } from "framer-motion";

interface BottomHintProps {
  /** Which hint is active (mutually exclusive); null shows nothing. */
  kind: "controls" | "prompt" | null;
  message: string;
  isTouch?: boolean;
}

// The single bottom-center hint shared by the idle "controls" hint and the
// interactable prompt. They never co-exist, and `mode="wait"` makes the swap
// sequential: the outgoing hint fades fully out before the incoming one fades in
// (otherwise, sitting at the same spot, they'd briefly overlap).
export default function BottomHint({ kind, message, isTouch = false }: BottomHintProps) {
  return (
    <AnimatePresence mode="wait">
      {kind && (
        <motion.div
          key={kind}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className={`absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none rounded-2xl border border-[rgba(122,158,126,0.7)] bg-[rgba(254,249,236,0.95)] px-4 py-2 font-mono text-[13px] sm:text-[14px] text-walnut shadow-[0_4px_20px_rgba(28,21,8,0.2)] text-center ${
            kind === "controls" && isTouch ? "controls-hint-touch max-w-[90vw]" : "bottom-10 hud-hint-clear"
          }`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
