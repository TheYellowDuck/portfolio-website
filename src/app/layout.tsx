import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "George Zhang — Portfolio",
  description: "CS student at the University of Waterloo — projects, experience, and an explorable pixel-art museum.",
  openGraph: {
    title: "George Zhang — Portfolio",
    description: "CS student at the University of Waterloo — projects, experience, and an explorable pixel-art museum.",
    type: "website",
    siteName: "George Zhang",
  },
  twitter: {
    card: "summary_large_image",
    title: "George Zhang — Portfolio",
    description: "CS student at the University of Waterloo — projects, experience, and an explorable pixel-art museum.",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
