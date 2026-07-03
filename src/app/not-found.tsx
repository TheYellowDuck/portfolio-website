// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import Link from "next/link";
import { PERSON } from "@/lib/site";
import { content } from "@/content";

export const metadata = { title: `Not found — ${PERSON.name}` };

// Museum-themed 404 so a bad link lands somewhere intentional rather than the
// default Next.js page. Server component; inherits the theme from the layout.
export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center gap-5 bg-parchment px-6 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.35em] text-pine">{content.notFound.code}</p>
      <h1 className="font-display text-[clamp(30px,7vw,56px)] font-semibold tracking-tight text-walnut text-balance">
        {content.notFound.title}
      </h1>
      <p className="max-w-[46ch] font-sans leading-relaxed text-walnut/80">
        {content.notFound.body}
      </p>
      <Link
        href="/"
        className="mt-1 rounded-full border border-[rgba(122,158,126,0.6)] bg-[rgba(122,158,126,0.12)] px-5 py-2 font-mono text-[13px] text-pine transition-colors hover:bg-[rgba(122,158,126,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
      >
        {content.notFound.back}
      </Link>
    </main>
  );
}
