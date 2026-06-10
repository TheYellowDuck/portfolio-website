"use client";

import { useEffect, useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms
}

/**
 * Fade + lift content in when it scrolls into view (once). Reveals by mutating the
 * element's style directly (the effect-updates-the-DOM pattern — no React state),
 * and reveals immediately under prefers-reduced-motion.
 */
export default function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reveal = () => {
      el.style.opacity = "1";
      el.style.transform = "none";
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-anim ${className}`}
      style={{
        opacity: 0,
        transform: "translateY(18px)",
        transition: `opacity 550ms ease-out ${delay}ms, transform 550ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
