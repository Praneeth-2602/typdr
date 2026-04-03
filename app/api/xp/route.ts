import { NextRequest, NextResponse } from "next/server";
import {
  getCollections,
  levelFromXp,
  xpForLevel,
} from "@/lib/server/db";
import { requireSessionIdentity } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    void req;
    const identity = await requireSessionIdentity();

    const { userStats } = await getCollections();
    const stats = await userStats.findOne({ userId: identity.userId });

    const xp    = stats?.xp    ?? 0;
    const level = stats?.level ?? levelFromXp(xp);

    return NextResponse.json({
      xp,
      level,
      xpForCurrentLevel: xpForLevel(level),
      xpForNextLevel:    xpForLevel(level + 1),
      sessionsCompleted: stats?.sessionsCompleted ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch XP.";
    const status  = /Unauthorized/.test(message) ? 401 : /Missing MONGODB_URI/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
