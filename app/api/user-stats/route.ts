import { NextRequest, NextResponse } from "next/server";
import { computeStrongKeyStats, computeWeakKeyStats, getCollections, levelFromXp, xpForLevel } from "@/lib/server/db";
import { requireSessionIdentity } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    void req;
    const identity = await requireSessionIdentity();

    const { userStats } = await getCollections();
    const stats = await userStats.findOne({ userId: identity.userId });

    if (!stats) {
      return NextResponse.json({
        userId:           identity.userId,
        username:         identity.username,
        sessionsCompleted: 0,
        weakKeys:         [],
        strongKeys:       [],
        keyStats:         {},
        xp:               0,
        level:            1,
        xpForCurrentLevel: 0,
        xpForNextLevel:   xpForLevel(2),
        cachedDrill:      null,
        updatedAt:        null,
      });
    }

    const xp    = stats.xp    ?? 0;
    const level = stats.level ?? levelFromXp(xp);

    return NextResponse.json({
      userId:           stats.userId,
      username:         stats.username,
      sessionsCompleted: stats.sessionsCompleted,
      weakKeys:         computeWeakKeyStats(stats.keyStats, 5),
      strongKeys:       computeStrongKeyStats(stats.keyStats, 5),
      keyStats:         stats.keyStats,
      xp,
      level,
      xpForCurrentLevel: xpForLevel(level),
      xpForNextLevel:   xpForLevel(level + 1),
      cachedDrill:      (stats as Record<string, unknown>).cachedDrill ?? null,
      updatedAt:        stats.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch user stats.";
    const status = /Unauthorized/.test(message) ? 401 : /required|Missing MONGODB_URI/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

