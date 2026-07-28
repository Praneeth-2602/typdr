import { NextRequest } from "next/server";
import { getDailyChallenge } from "@/lib/data/corpus";
import {
  applyRateLimit,
  jsonWithRateLimit,
  optionalApiKeyOrPublic,
} from "@/lib/server/apiAuth";

export const runtime = "nodejs";

/**
 * GET /api/v1/daily — today's challenge text (deterministic, UTC)
 */
export async function GET(req: NextRequest) {
  const { result, response } = applyRateLimit(req, "v1:daily", 120);
  if (response) return response;

  const auth = await optionalApiKeyOrPublic(req);
  if (auth.error) return auth.error;

  const challenge = getDailyChallenge();
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  return jsonWithRateLimit(
    {
      data: {
        date,
        text: challenge.text,
        label: challenge.label,
      },
    },
    result
  );
}
