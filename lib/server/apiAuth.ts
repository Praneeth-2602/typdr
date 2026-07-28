import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCollections } from "@/lib/server/db";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
  type RateLimitResult,
} from "@/lib/server/rateLimit";

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function resolveApiKeyIdentity(
  req: Request
): Promise<{ userId: string; username: string; via: "api_key" } | null> {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token || token.length < 16) return null;

  const { apiKeys } = await getCollections();
  const keyHash = hashApiKey(token);
  const doc = await apiKeys.findOne({ keyHash, revoked: { $ne: true } });
  if (!doc) return null;

  void apiKeys.updateOne(
    { keyHash },
    { $set: { lastUsedAt: new Date() } }
  );

  return { userId: doc.userId, username: doc.username, via: "api_key" };
}

export async function resolveSessionOrApiKey(req: Request): Promise<{
  userId: string;
  username: string;
  via: "session" | "api_key";
} | null> {
  const apiIdentity = await resolveApiKeyIdentity(req);
  if (apiIdentity) return apiIdentity;

  const session = await auth();
  const userId = session?.user?.id?.trim();
  const username = session?.user?.name?.trim();
  if (!userId || !username) return null;
  return { userId, username, via: "session" };
}

/**
 * Optional API key: if Bearer present, must be valid.
 * If absent, allow public read (returns null identity).
 */
export async function optionalApiKeyOrPublic(req: Request): Promise<{
  identity: { userId: string; username: string } | null;
  error?: NextResponse;
}> {
  const header = req.headers.get("authorization");
  if (!header) return { identity: null };

  if (!header.startsWith("Bearer ")) {
    return {
      identity: null,
      error: NextResponse.json(
        { error: "Invalid Authorization header. Use Bearer <api_key>." },
        { status: 401 }
      ),
    };
  }

  const identity = await resolveApiKeyIdentity(req);
  if (!identity) {
    return {
      identity: null,
      error: NextResponse.json({ error: "Invalid API key." }, { status: 401 }),
    };
  }
  return { identity };
}

export function applyRateLimit(
  req: Request,
  routeKey: string,
  limit = 60,
  windowMs = 60_000
): { result: RateLimitResult; response?: NextResponse } {
  const key = clientKeyFromRequest(req, routeKey);
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) {
    return {
      result,
      response: NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(result),
            "Retry-After": String(
              Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
            ),
          },
        }
      ),
    };
  }
  return { result };
}

export function jsonWithRateLimit(
  body: unknown,
  result: RateLimitResult,
  init?: { status?: number }
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: rateLimitHeaders(result),
  });
}
