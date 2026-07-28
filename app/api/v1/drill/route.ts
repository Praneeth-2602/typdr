import { NextRequest } from "next/server";
import {
  applyRateLimit,
  jsonWithRateLimit,
  resolveSessionOrApiKey,
} from "@/lib/server/apiAuth";
import {
  generateDrill,
  validateDrillRequest,
} from "@/lib/server/drillGenerate";

export const runtime = "nodejs";

/**
 * POST /api/v1/drill — requires session OR API key
 * Body: { weakKeys, slowBigrams, currentWpm, mode }
 */
export async function POST(req: NextRequest) {
  const { result, response } = applyRateLimit(req, "v1:drill", 20);
  if (response) return response;

  try {
    const identity = await resolveSessionOrApiKey(req);
    if (!identity) {
      return jsonWithRateLimit(
        { error: "Authentication required (session or API key)." },
        result,
        { status: 401 }
      );
    }

    const parsed = validateDrillRequest(await req.json());
    if (!parsed) {
      return jsonWithRateLimit({ error: "Invalid drill payload." }, result, {
        status: 400,
      });
    }

    const drill = await generateDrill(parsed);
    return jsonWithRateLimit(
      {
        data: {
          drill: drill.drill,
          provider: drill.provider,
          fallbackUsed: drill.fallbackUsed,
        },
        meta: {
          auth: identity.via,
          username: identity.username,
        },
      },
      result
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate drill.";
    const status = /No LLM API key/.test(message)
      ? 503
      : /Failed to generate/.test(message)
        ? 502
        : 500;
    return jsonWithRateLimit({ error: message }, result, { status });
  }
}
