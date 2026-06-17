import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque, Pixelify_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import FaviconSwitcher from "@/components/FaviconSwitcher";
import "./globals.css";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION, PERSON } from "@/lib/site";
import { currentRole } from "@/data/projects";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the name + headings — characterful and a little handcrafted,
// so the museum doesn't read as the default Next.js starter (Geist stays for body).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Pixel face for in-game canvas labels (exhibit names) so they sit naturally in the pixel-art
// museum instead of clashing as smooth modern text.
const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  authors: [{ name: PERSON.name, url: SITE_URL }],
  creator: PERSON.name,
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
  // Tab favicon: <FaviconSwitcher> swaps a PNG by the in-app theme so Chrome/Firefox
  // flip the tab live (each palette is a distinct URL, which forces a re-rasterize; an
  // SVG @media icon does NOT re-render the cached tab bitmap, and Safari can't change a
  // favicon by any method). The static PNG here is the initial / no-JS / Safari icon.
  icons: {
    icon: { url: "/icon-light", type: "image/png", sizes: "512x512" },
    apple: "/apple-icon",
  },
};

// Fit the device width and extend under notches (the touch controls pad themselves with safe-area
// insets). Pinch/double-tap zoom stays enabled for accessibility — the default landing is the web
// portfolio, and the canvas game's own touch handlers manage in-game gestures on the canvas itself.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#1c1508",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Current employer for `worksFor` — derived from the experience data, never a hardcoded literal.
  const employer = currentRole()?.title;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${pixel.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the saved/system theme before paint to avoid a light flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var t=localStorage.getItem('museum:theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();",
          }}
        />
        {/* Without JS the scroll-reveal content never un-hides and the intro curtain never lifts,
            so force the content visible and drop the curtain. */}
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: ".reveal-anim{opacity:1!important;transform:none!important}.intro-curtain{display:none!important}" }} />
        </noscript>
        {/* rel="me" — ties these profiles to this site so search/AI crawlers (and IndieWeb) treat
            them as one identity; mirrors the JSON-LD sameAs below. */}
        {PERSON.sameAs.map((u) => (
          <link key={u} rel="me" href={u} />
        ))}
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Person",
                  "@id": `${SITE_URL}/#person`,
                  name: PERSON.name,
                  url: SITE_URL,
                  jobTitle: PERSON.jobTitle,
                  description: PERSON.bio,
                  email: `mailto:${PERSON.email}`,
                  alumniOf: { "@type": "CollegeOrUniversity", name: PERSON.alumniOf },
                  ...(employer ? { worksFor: { "@type": "Organization", name: employer } } : {}),
                  knowsAbout: PERSON.knowsAbout,
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: PERSON.location.city,
                    addressRegion: PERSON.location.region,
                    addressCountry: PERSON.location.country,
                  },
                  sameAs: PERSON.sameAs,
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: SITE_TITLE,
                  description: SITE_DESCRIPTION,
                  inLanguage: "en",
                  publisher: { "@id": `${SITE_URL}/#person` },
                },
                {
                  "@type": "ProfilePage",
                  "@id": `${SITE_URL}/#profilepage`,
                  url: SITE_URL,
                  name: SITE_TITLE,
                  isPartOf: { "@id": `${SITE_URL}/#website` },
                  about: { "@id": `${SITE_URL}/#person` },
                  mainEntity: { "@id": `${SITE_URL}/#person` },
                },
              ],
            }),
          }}
        />
        {children}
        <FaviconSwitcher />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
