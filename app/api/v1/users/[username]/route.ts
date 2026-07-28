import { NextRequest } from "next/server";
import { getCollections } from "@/lib/server/db";
import {
  applyRateLimit,
  jsonWithRateLimit,
  optionalApiKeyOrPublic,
} from "@/lib/server/apiAuth";

export const runtime = "nodejs";

interface RouteParams {
  params: { username: string };
}

/**
 * GET /api/v1/users/:username — public profile stats
 */
export async function GET(req: NextRequest, context: RouteParams) {
  const { result, response } = applyRateLimit(req, "v1:users", 60);
  if (response) return response;

  const auth = await optionalApiKeyOrPublic(req);
  if (auth.error) return auth.error;

  try {
    const username = decodeURIComponent(context.params.username ?? "").trim();
    if (!username) {
      return jsonWithRateLimit({ error: "username is required." }, result, {
        status: 400,
      });
    }

    const { leaderboard, userStats, streaks } = await getCollections();

    const [lb, stats, streak] = await Promise.all([
      leaderboard.findOne(
        { username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") } },
        { projection: { _id: 0, userId: 0 } }
      ),
      userStats.findOne(
        { username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") } },
        { projection: { _id: 0, userId: 0, keyStats: 0 } }
      ),
      streaks.findOne(
        { username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") } },
        { projection: { _id: 0, userId: 0 } }
      ),
    ]);

    if (!lb && !stats) {
      return jsonWithRateLimit({ error: "User not found." }, result, {
        status: 404,
      });
    }

    return jsonWithRateLimit(
      {
        data: {
          username: lb?.username ?? stats?.username ?? username,
          bestScore: lb?.bestScore ?? 0,
          avgWpm: lb?.avgWpm ?? 0,
          avgAccuracy: lb?.avgAccuracy ?? 0,
          testsCompleted: lb?.testsCompleted ?? stats?.sessionsCompleted ?? 0,
          sessionsCompleted: stats?.sessionsCompleted ?? lb?.testsCompleted ?? 0,
          level: stats?.level ?? 1,
          xp: stats?.xp ?? 0,
          currentStreak: streak?.currentStreak ?? 0,
          longestStreak: streak?.longestStreak ?? 0,
          updatedAt: lb?.updatedAt ?? stats?.updatedAt ?? null,
        },
      },
      result
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch user.";
    return jsonWithRateLimit({ error: message }, result, { status: 500 });
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
