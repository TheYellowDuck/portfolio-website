import Link from "next/link";

export const metadata = { title: "Not found — George Zhang" };

// Museum-themed 404 so a bad link lands somewhere intentional rather than the
// default Next.js page. Server component; inherits the theme from the layout.
export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center gap-5 bg-parchment px-6 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.35em] text-pine">Error 404</p>
      <h1 className="font-display text-[clamp(30px,7vw,56px)] font-semibold tracking-tight text-walnut text-balance">
        This exhibit isn&apos;t here
      </h1>
      <p className="max-w-[46ch] font-sans leading-relaxed text-walnut/80">
        The page you were looking for has been moved, retired, or never hung on these walls.
      </p>
      <Link
        href="/"
        className="mt-1 rounded-full border border-[rgba(122,158,126,0.6)] bg-[rgba(122,158,126,0.12)] px-5 py-2 font-mono text-[13px] text-pine transition-colors hover:bg-[rgba(122,158,126,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
      >
        ← Back to the entrance
      </Link>
    </main>
  );
}
