import { NextRequest, NextResponse } from "next/server";
import { getSeasonLeaderboard } from "@/lib/server/seasons";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id?.trim();
    const limitValue = Number(new URL(req.url).searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitValue)
      ? Math.min(Math.max(limitValue, 1), 50)
      : 20;

    const data = await getSeasonLeaderboard(limit, userId);

    return NextResponse.json({
      season: {
        label: data.season.label,
        name: data.season.name,
        startAt: data.season.startAt,
        endAt: data.season.endAt,
        archived: data.season.archived,
      },
      daysRemaining: data.daysRemaining,
      userRank: data.userRank,
      leaderboard: data.entries,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load season.";
    const status = /Missing MONGODB_URI/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
