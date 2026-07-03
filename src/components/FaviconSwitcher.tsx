// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

"use client";

import { useEffect } from "react";
import { useDarkMode } from "@/lib/use-dark-mode";

const ID = "dynamic-favicon";

// Swap the tab favicon to match the in-app theme. Each palette is its own URL, and
// we replace the <link> element so Chrome/Firefox re-rasterize the tab. No crossfade:
// browsers hard-rate-limit favicon repaints (~3 paints per change), so any animation
// stutters — a clean instant swap is the right call. Safari ignores JS favicon
// changes entirely, so it shows the static icon (one palette).
export default function FaviconSwitcher() {
  const dark = useDarkMode();

  useEffect(() => {
    const href = dark ? "/icon-dark" : "/icon-light";
    document.getElementById(ID)?.remove();
    const link = document.createElement("link");
    link.id = ID;
    link.rel = "icon";
    link.type = "image/png";
    link.setAttribute("sizes", "any");
    link.href = href;
    document.head.appendChild(link);
  }, [dark]);

  return null;
}
