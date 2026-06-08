"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ControlsHintProps {
  visible: boolean;
  message?: string;
  isTouch?: boolean;
}

export default function ControlsHint({ visible, message = "WASD to move · Shift to sprint", isTouch = false }: ControlsHintProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          // On touch, float it above the joystick/interact buttons (which own the
          // bottom corners) so it never overlaps them; on desktop, sit at the bottom.
          className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none rounded-2xl border border-[rgba(122,158,126,0.7)] bg-[rgba(254,249,236,0.95)] px-4 py-2 max-w-[90vw] font-mono text-[13px] sm:text-[14px] text-walnut shadow-[0_4px_20px_rgba(28,21,8,0.2)] text-center"
          style={isTouch ? { bottom: "calc(env(safe-area-inset-bottom, 0px) + 196px)" } : { bottom: "2.5rem" }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
