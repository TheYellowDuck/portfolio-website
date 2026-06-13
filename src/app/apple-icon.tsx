import { ImageResponse } from "next/og";
import { iconMark } from "@/lib/icon-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon — the doorway mark, rounded to match the favicon. iOS doesn't
// swap favicons by scheme, so it gets the warm dusk palette.
export default function AppleIcon() {
  return new ImageResponse(iconMark(size.width, { palette: "dusk", rounded: true }), size);
}
