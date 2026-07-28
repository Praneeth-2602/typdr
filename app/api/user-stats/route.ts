import { NextRequest, NextResponse } from "next/server";
import { computeStrongKeyStats, computeWeakKeyStats, getCollections, levelFromXp, xpForLevel } from "@/lib/server/db";
import { requireSessionIdentity } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    void req;
    const identity = await requireSessionIdentity();

    const { sessions, userStats, leaderboard } = await getCollections();
    const stats = await userStats.findOne({ userId: identity.userId });

    // Recent sessions (last 20) for the profile table
    const recentSessionsDocs = await sessions
      .find({ userId: identity.userId }, { projection: { _id: 0, session: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    const recentSessions = recentSessionsDocs.map((d: any) => d.session).filter(Boolean);

    // All-time aggregates for join date + total time + avg accuracy
    const agg = await sessions
      .aggregate([
        { $match: { userId: identity.userId } },
        {
          $group: {
            _id: null,
            joinDate: { $min: "$createdAt" },
            bestWpm: { $max: "$session.wpm" },
            avgAccuracy: { $avg: "$session.accuracy" },
            totalTimeMs: { $sum: "$session.duration" },
            totalSessions: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const aggRow = agg[0] ?? null;
    const joinDate = aggRow?.joinDate ? new Date(aggRow.joinDate).toISOString() : null;
    const bestWpm = Number(aggRow?.bestWpm ?? 0);
    const avgAccuracy = Number(aggRow?.avgAccuracy ?? 0);
    const totalTimeMs = Number(aggRow?.totalTimeMs ?? 0);
    const totalSessionsFromSessions = Number(aggRow?.totalSessions ?? 0);

    if (!stats) {
      return NextResponse.json({
        userId:           identity.userId,
        username:         identity.username,
        sessionsCompleted: 0,
        joinDate,
        bestWpm,
        avgAccuracy: Math.round(avgAccuracy),
        totalTimeMs,
        leaderboardRank: null,
        recentSessions,
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

    const myBestScoreDoc = await leaderboard.findOne(
      { userId: identity.userId },
      { projection: { _id: 0, bestScore: 1 } }
    );
    const myBestScore = Number(myBestScoreDoc?.bestScore ?? 0);
    const betterCount =
      myBestScore > 0
        ? await leaderboard.countDocuments({ bestScore: { $gt: myBestScore } })
        : 0;
    const leaderboardRank = myBestScore > 0 ? betterCount + 1 : null;

    return NextResponse.json({
      userId:           stats.userId,
      username:         stats.username,
      sessionsCompleted: stats.sessionsCompleted,
      joinDate,
      bestWpm,
      avgAccuracy: Math.round(avgAccuracy),
      totalTimeMs,
      leaderboardRank,
      recentSessions,
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

