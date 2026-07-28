import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const wpm = searchParams.get("wpm") ?? "—";
  const accuracy = searchParams.get("accuracy") ?? "—";
  const mode = searchParams.get("mode") ?? "words";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(145deg, #0e0e10 0%, #1a1a1e 55%, #12141a 100%)",
          color: "#e2e8f0",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 36, fontWeight: 700 }}>
          <span style={{ color: "#e8f55c" }}>typ</span>
          <span style={{ color: "#38bdf8" }}>dr</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 28, color: "#94a3b8" }}>I just typed</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: 96, fontWeight: 700, color: "#e8f55c" }}>{wpm}</span>
            <span style={{ fontSize: 36, color: "#94a3b8" }}>WPM</span>
          </div>
          <div style={{ display: "flex", gap: 28, fontSize: 28, color: "#cbd5e1" }}>
            <span>{accuracy}% accuracy</span>
            <span style={{ color: "#64748b" }}>·</span>
            <span style={{ textTransform: "uppercase", letterSpacing: 2 }}>{mode}</span>
          </div>
        </div>

        <div style={{ fontSize: 22, color: "#64748b" }}>type faster. learn smarter.</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
