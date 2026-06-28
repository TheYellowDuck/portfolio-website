"use client";

import { useEffect, useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms
  /** Entrance that fits what's revealed: lift (content), fade (headers), slide (timeline). */
  variant?: "up" | "fade" | "left";
  /** Override the transition duration (ms). Defaults to 750 for a gentle, gradual fade. */
  duration?: number;
  /** Override the starting offset (px). For "up"/"fade" it starts below; for "left", to the left. */
  distance?: number;
}

const FROM: Record<NonNullable<RevealProps["variant"]>, string> = {
  up: "translateY(18px)",
  fade: "translateY(7px)",
  left: "translateX(-22px)",
};

/**
 * Fade content in when it scrolls into view (once), with a per-context entrance.
 * Reveals by mutating the element's style directly (the effect-updates-the-DOM
 * pattern — no React state), and reveals immediately under prefers-reduced-motion.
 */
export default function Reveal({ children, className = "", delay = 0, variant = "up", duration = 750, distance }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const from =
    distance != null
      ? variant === "left" ? `translateX(-${distance}px)` : `translateY(${distance}px)`
      : FROM[variant];

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
        transform: from,
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
