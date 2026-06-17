import { ImageResponse } from "next/og";
import { PERSON, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";

export const alt = `${PERSON.name} — interactive museum portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cozy, editorial OG card in the museum palette (parchment + walnut + sage),
// with a lamplit "doorway" hinting at the explorable game.
export default function OpengraphImage() {
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

        {/* Right: the lamplit doorway */}
        <div style={{ display: "flex", alignItems: "center", paddingLeft: 56 }}>
          <div
            style={{
              width: 340,
              height: 440,
              borderRadius: 28,
              border: "1px solid rgba(58,46,30,0.18)",
              background: "radial-gradient(120% 90% at 50% 24%, #2c2310 0%, #1c1508 70%)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: 36,
            }}
          >
            <div
              style={{
                color: "#f0ce78",
                fontSize: 22,
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
