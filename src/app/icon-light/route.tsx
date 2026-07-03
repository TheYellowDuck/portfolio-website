// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import { ImageResponse } from "next/og";
import { iconMark } from "@/lib/icon-mark";

// Golden-hour dusk PNG of the doorway mark — the light-theme favicon (set by
// <FaviconSwitcher>), the static/no-JS/Safari favicon, and the manifest icon.
export function GET() {
  return new ImageResponse(iconMark(512, { palette: "dusk" }), { width: 512, height: 512 });
}
