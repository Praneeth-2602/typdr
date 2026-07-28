import { NextRequest, NextResponse } from "next/server";
import { archivePreviousSeason, getCurrentSeason } from "@/lib/server/seasons";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Vercel Cron-compatible season archive endpoint.
 * Protect with Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set.
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = env.CRON_SECRET?.trim();
    if (cronSecret) {
      const authHeader = req.headers.get("authorization") ?? "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : "";
      if (token !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const archived = await archivePreviousSeason();
    const current = await getCurrentSeason();

    return NextResponse.json({
      ok: true,
      archivedSeason: archived.label,
      didArchive: archived.archived,
      currentSeason: {
        label: current.label,
        name: current.name,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Season cron failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
