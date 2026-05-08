"use client";

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
      background: "rgba(254, 249, 236, 0.95)",
      border: "1px solid rgba(122,158,126,0.7)",
      borderRadius: 6,
      padding: "10px 24px",
      color: "#3a2e1e",
      fontFamily: "monospace",
      fontSize: 14,
      pointerEvents: "none",
      zIndex: 10,
      boxShadow: "0 4px 20px rgba(28,21,8,0.2)",
    }}>
      {message}
    </div>
  );
}
