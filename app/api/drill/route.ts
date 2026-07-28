import { NextRequest, NextResponse } from "next/server";
import {
  generateDrill,
  resolveDrillProviderConfig,
  validateDrillRequest,
} from "@/lib/server/drillGenerate";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/server/rateLimit";

export const runtime = "nodejs";

export async function GET() {
  const config = resolveDrillProviderConfig();
  return NextResponse.json({
    providersAvailable: config.available,
    preferredProvider: config.preferred,
    hasAnyProvider: config.available.groq || config.available.gemini,
  });
}

export async function POST(req: NextRequest) {
  const key = clientKeyFromRequest(req, "drill");
  const rl = rateLimit(key, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(rl),
          "Retry-After": String(
            Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))
          ),
        },
      }
    );
  }

  try {
    const parsed = validateDrillRequest(await req.json());
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid drill payload." },
        { status: 400, headers: rateLimitHeaders(rl) }
      );
    }

    const result = await generateDrill(parsed);
    return NextResponse.json(
      {
        drill: result.drill,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        providersAvailable: result.providersAvailable,
        preferredProvider: result.preferredProvider,
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (err) {
    console.error("Drill generation error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate drill";
    const status = /No LLM API key/.test(message)
      ? 503
      : /Failed to generate/.test(message)
        ? 502
        : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: rateLimitHeaders(rl) }
    );
  }
}
