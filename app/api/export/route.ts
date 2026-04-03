// ─────────────────────────────────────────────────────────────────────────────
// app/api/export/route.ts  v3 — NEW
//
// Serverless Edge route that converts a JSON session array into CSV.
// Called by the analytics page "Export CSV" button.
// All processing happens server-side so the client doesn't need a CSV library.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import type { SessionResult } from "@/lib/stores/analytics";

export const runtime = "edge";

function escapeCsv(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const sessions: SessionResult[] = await req.json();

    const headers = [
      "date",
      "time",
      "mode",
      "wpm",
      "raw_wpm",
      "accuracy",
      "consistency",
      "duration_s",
      "correct_chars",
      "incorrect_chars",
      "total_chars",
    ];

    const rows = sessions.map((s) => {
      const d = new Date(s.timestamp);
      return [
        d.toLocaleDateString("en-CA"),           // ISO date
        d.toLocaleTimeString("en-IN"),
        s.mode,
        s.wpm,
        s.rawWpm,
        s.accuracy,
        s.consistency,
        Math.round(s.duration),
        s.correctChars,
        s.incorrectChars,
        s.totalChars,
      ].map(escapeCsv).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="swiftkeys-sessions-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
