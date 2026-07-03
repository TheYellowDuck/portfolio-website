// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { PERSON } from "@/lib/site";
import { content } from "@/content";

interface LoadingScreenProps {
  visible: boolean;
  loaded: number;
  total: number;
}

export default function LoadingScreen({ visible, loaded, total }: LoadingScreenProps) {
  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1c1508] transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        <h1 className="font-sans text-3xl tracking-[0.25em] text-ink-1 uppercase">
          {PERSON.name}
        </h1>
        <p className="font-mono text-xs tracking-[0.35em] text-ink-3 uppercase">
          {content.loading.subtitle}
        </p>
        <div className="mt-3 flex gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-sage animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-sage animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-sage animate-bounce [animation-delay:300ms]" />
        </div>
        <p className="font-mono text-[11px] tracking-[0.2em] text-ink-3 uppercase">
          {total > 0 ? `${pct}%` : content.loading.loading}
        </p>
      </div>
    </div>
  );
}
