import type { MetadataRoute } from "next";
import { SITE_TITLE, PERSON } from "@/lib/site";

// Web app manifest — makes the site installable with proper home-screen icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: PERSON.name,
    description: "An interactive pixel-art museum portfolio — wander the work, or read it straight.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fef9ec", // parchment
    theme_color: "#1c1508",      // lamplit doorway
    icons: [
      // The web icon is a rounded tile, so it's declared "any" (not maskable, which
      // requires full-bleed corners). iOS uses the full-bleed apple-icon.
      { src: "/icon-light", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
