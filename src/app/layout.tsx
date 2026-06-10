import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION, PERSON } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    url: "/",
    siteName: PERSON.name,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

// Lock the viewport for the canvas game: fit the device width, no pinch/double-tap
// zoom, and extend under notches (the touch controls pad themselves with safe-area insets).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1c1508",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the saved/system theme before paint to avoid a light flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var t=localStorage.getItem('museum:theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();",
          }}
        />
        {/* Without JS the scroll-reveal content never un-hides, so force it visible. */}
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: ".reveal-anim{opacity:1!important;transform:none!important}" }} />
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: PERSON.name,
              url: SITE_URL,
              jobTitle: PERSON.jobTitle,
              email: `mailto:${PERSON.email}`,
              alumniOf: { "@type": "CollegeOrUniversity", name: PERSON.alumniOf },
              sameAs: PERSON.sameAs,
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
