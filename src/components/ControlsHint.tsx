"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ControlsHintProps {
  visible: boolean;
}

export default function ControlsHint({ visible }: ControlsHintProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none rounded-md border border-[rgba(122,158,126,0.7)] bg-[rgba(254,249,236,0.95)] px-6 py-2.5 font-mono text-[14px] text-[#3a2e1e] shadow-[0_4px_20px_rgba(28,21,8,0.2)]"
        >
          WASD to move · Shift to sprint
        </motion.div>
      )}
    </AnimatePresence>
  );
}
