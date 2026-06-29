"use client";

import { useEffect } from "react";
import { PressButton } from "@/components/PressButton";

// Route-level error boundary — catches render errors in the page (site + game)
// and degrades gracefully instead of white-screening.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-5 bg-parchment px-6 text-center text-walnut">
      <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-pine">Something broke</p>
      <h1 className="font-sans text-[28px] font-semibold tracking-tight">
        A pedestal tipped over.
      </h1>
      <p className="max-w-md text-[15px] leading-relaxed text-walnut/70">
        An unexpected error interrupted the museum. Try again, or head back to the entrance.
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-3 font-mono text-[13px]">
        <PressButton
          onClick={reset}
          className="rounded-full border border-[rgba(122,158,126,0.6)] bg-[rgba(122,158,126,0.12)] px-5 py-2 text-pine transition-colors hover:bg-[rgba(122,158,126,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
        >
          Try again
        </PressButton>
        <PressButton
          onClick={() => window.location.reload()}
          className="rounded-full border border-[rgba(58,46,30,0.2)] px-5 py-2 text-walnut/80 transition-colors hover:border-[rgba(122,158,126,0.5)] hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
        >
          Reload
        </PressButton>
      </div>
    </div>
  );
}
