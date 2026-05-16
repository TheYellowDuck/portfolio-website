"use client";

interface DialogBoxProps {
  message: string;
  visible: boolean;
}

export default function DialogBox({ message, visible }: DialogBoxProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none rounded-md border border-[rgba(122,158,126,0.7)] bg-[rgba(254,249,236,0.95)] px-6 py-2.5 font-system-mono text-[14px] text-[#3a2e1e] shadow-[0_4px_20px_rgba(28,21,8,0.2)]">
      {message}
    </div>
  );
}
