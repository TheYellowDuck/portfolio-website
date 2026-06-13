import { ImageResponse } from "next/og";
import { iconMark } from "@/lib/icon-mark";

// Sage & gold PNG of the doorway mark — the dark-theme favicon, swapped in by
// <FaviconSwitcher> when the in-app theme is dark.
export function GET() {
  return new ImageResponse(iconMark(512, { palette: "sage" }), { width: 512, height: 512 });
}
