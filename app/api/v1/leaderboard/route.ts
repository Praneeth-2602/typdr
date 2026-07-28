import { NextRequest } from "next/server";
import { getCollections } from "@/lib/server/db";
import {
  applyRateLimit,
  jsonWithRateLimit,
  optionalApiKeyOrPublic,
} from "@/lib/server/apiAuth";

export const runtime = "nodejs";

/**
 * GET /api/v1/leaderboard
 * Public read. Optional Bearer API key validated if present.
 * Rate limited by IP (no Redis — headers only).
 */
export async function GET(req: NextRequest) {
  const { result, response } = applyRateLimit(req, "v1:leaderboard", 60);
  if (response) return response;

  const auth = await optionalApiKeyOrPublic(req);
  if (auth.error) return auth.error;

  try {
    const limitValue = Number(new URL(req.url).searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitValue)
      ? Math.min(Math.max(limitValue, 1), 100)
      : 20;

    const { leaderboard } = await getCollections();
    const entries = await leaderboard
      .find(
        {},
        {
          projection: {
            _id: 0,
            userId: 0,
          },
        }
      )
      .sort({ bestScore: -1, avgWpm: -1, avgAccuracy: -1, updatedAt: -1 })
      .limit(limit)
      .toArray();

    return jsonWithRateLimit(
      {
        data: entries.map((e) => ({
          username: e.username,
          bestScore: e.bestScore,
          avgWpm: e.avgWpm,
          avgAccuracy: e.avgAccuracy,
          testsCompleted: e.testsCompleted,
          updatedAt: e.updatedAt,
        })),
        meta: { limit, count: entries.length },
      },
      result
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch leaderboard.";
    return jsonWithRateLimit({ error: message }, result, { status: 500 });
  }
}
