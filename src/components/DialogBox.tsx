"use client";

import { COLORS } from "@/styles/theme";

interface DialogBoxProps {
  message: string;
  visible: boolean;
}

export default function DialogBox({ message, visible }: DialogBoxProps) {
  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 40,
      left: "50%",
      transform: "translateX(-50%)",
      background: COLORS.DIALOG_BG,
      border: `1px solid ${COLORS.DIALOG_BORDER}`,
      borderRadius: 6,
      padding: "10px 24px",
      color: COLORS.TEXT_DARK,
      fontFamily: "monospace",
      fontSize: 14,
      pointerEvents: "none",
      zIndex: 10,
      boxShadow: `0 4px 20px ${COLORS.DIALOG_SHADOW}`,
    }}>
      {message}
    </div>
  );
}
