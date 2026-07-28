/**
 * Environment validation — import from server-side code only.
 * Missing required vars throw clearly in production instead of failing mid-request.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
  MONGODB_URI: requireEnv("MONGODB_URI"),
  MONGODB_DB: process.env.MONGODB_DB ?? "typdr",
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  DRILL_PROVIDER: (process.env.DRILL_PROVIDER ?? "auto") as "auto" | "groq" | "gemini",
  GITHUB_ID: process.env.GITHUB_ID ?? "",
  GITHUB_SECRET: process.env.GITHUB_SECRET ?? "",
  GOOGLE_ID: process.env.GOOGLE_ID ?? "",
  GOOGLE_SECRET: process.env.GOOGLE_SECRET ?? "",
  CERT_SIGNING_SECRET:
    process.env.CERT_SIGNING_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "typdr-dev-cert-secret",
  /** Optional. When set, /api/seasons/cron requires Authorization: Bearer <secret>. */
  CRON_SECRET: process.env.CRON_SECRET ?? "",

  // Optional — background queue (Upstash)
  UPSTASH_URL: process.env.UPSTASH_URL ?? "",
  UPSTASH_TOKEN: process.env.UPSTASH_TOKEN ?? "",
};
