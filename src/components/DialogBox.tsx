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
      background: "rgba(22, 22, 42, 0.92)",
      border: "1px solid rgba(233,69,96,0.6)",
      borderRadius: 6,
      padding: "10px 24px",
      color: "#fff",
      fontFamily: "monospace",
      fontSize: 14,
      pointerEvents: "none",
      zIndex: 10,
    }}>
      {message}
    </div>
  );
}
