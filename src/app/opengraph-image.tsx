// Copyright (c) 2026 George Zhang. All rights reserved.
// Unauthorized copying, modification, or distribution of this file is prohibited.

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PERSON, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";

// Read the asset from disk (Node runtime) so the OG card can embed the actual game sprite.
export const runtime = "nodejs";
export const alt = `${PERSON.name} — interactive museum portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cozy, editorial OG card in the museum palette (parchment + walnut + sage): identity on the left,
// and on the right the pixel-art player character standing in a lamplit doorway — the same character
// you walk around the explorable museum as, so the social preview actually shows the game.
export default async function OpengraphImage() {
  const sprite = await readFile(
    join(process.cwd(), "public/assets/sprites/character/states/standing/rotations/south.png"),
  );
  const character = `data:image/png;base64,${sprite.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fef9ec",
          padding: 80,
          fontFamily: "Georgia, ui-serif, serif",
          position: "relative",
        }}
      >
        {/* Left: identity */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#5a8260",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Interactive Museum Portfolio
          </div>
          <div style={{ fontSize: 92, fontWeight: 700, color: "#3a2e1e", marginTop: 18, lineHeight: 1.02 }}>
            {PERSON.name}
          </div>
          <div style={{ width: 96, height: 5, background: "#7a9e7e", borderRadius: 3, marginTop: 28 }} />
          <div style={{ fontSize: 32, color: "#3a2e1e", opacity: 0.78, marginTop: 28, maxWidth: 560 }}>
            {SITE_DESCRIPTION}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#3a2e1e",
              opacity: 0.5,
              marginTop: 36,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </div>
        </div>

        {/* Right: the player character in a lamplit doorway */}
        <div style={{ display: "flex", alignItems: "center", paddingLeft: 56 }}>
          <div
            style={{
              position: "relative",
              width: 340,
              height: 440,
              borderRadius: 28,
              border: "1px solid rgba(58,46,30,0.18)",
              // Warm pool of lamplight low-centre (around the character) over the dark room.
              background:
                "radial-gradient(58% 40% at 50% 68%, rgba(240,206,120,0.32), rgba(0,0,0,0) 64%)," +
                "radial-gradient(120% 90% at 50% 22%, #2c2310 0%, #1c1508 72%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src={character} alt="" width={300} height={300} style={{ imageRendering: "pixelated" }} />
            <div
              style={{
                position: "absolute",
                bottom: 26,
                color: "#f0ce78",
                fontSize: 20,
                letterSpacing: 4,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Step inside →
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
