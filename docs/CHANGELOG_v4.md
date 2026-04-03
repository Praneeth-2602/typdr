# SwiftKeys v4 — Backend Integration Fixes

> This version fixes the broken auth + MongoDB backend that was partially
> implemented in v3. The architecture decision is documented below.
>
> Previous history: `CHANGELOG_v2.md`, `CHANGELOG_v3.md`.

---

## Architecture Decision: Stay Serverless

The codebase arrived with a partially-wired Next.js + MongoDB + NextAuth setup.
The question was: **separate Node.js backend, or fix the serverless approach?**

**Decision: stay serverless.** Here is why.

### Why a separate Node.js backend is unnecessary here

A standalone Express/Fastify server would require:
- A separate deployment (Railway, Render, Fly.io, etc.) with its own cost and uptime SLA
- CORS configuration between the Next.js frontend and the API server
- A separate process to manage in development (`npm run dev` becomes two terminals)
- Duplicated type definitions between the two codebases (or a shared package)
- A reverse proxy or API gateway to route requests in production

### Why Next.js API Routes are the right fit

Next.js API Routes **are** a Node.js server. When you deploy to Vercel, each route
becomes an independent serverless function running on Node.js 20. When you self-host
with `next start`, they run in a single long-lived Node.js process — identical to
Express. The only thing you give up is WebSocket support (not needed here).

This stack (Next.js API Routes + MongoDB Atlas + NextAuth v4) is used by thousands of
production applications and is fully supported by Vercel's free tier.

### What was actually broken

The code was correct structurally. Seven specific bugs prevented it from working:

1. Wrong environment variable name for the auth secret
2. Secret not passed into the NextAuth options object
3. `<Suspense>` missing on the sign-in page
4. No MongoDB connection options, causing cold-start hangs
5. `next.config.mjs` empty, missing the MongoDB external package declaration
6. `vercel.json` referenced old variable names
7. Dev mode had no fallback secret, crashing on first `next dev`

All seven are fixed in this release. No new features were added.

---

## Bug Fixes

### 1. `AUTH_SECRET` → `NEXTAUTH_SECRET` (critical — auth completely broken)
**Files:** `.env.example`, `auth.ts`, `vercel.json`

next-auth **v4** reads `NEXTAUTH_SECRET` from the environment. `AUTH_SECRET` is
the convention used by **Auth.js v5** (the next-generation rewrite). Using the wrong
name meant the JWT signing key was `undefined` — next-auth would throw at startup
in production, or silently generate a random key on every cold start in development
(invalidating all sessions on every server restart).

```diff
- AUTH_SECRET=
+ NEXTAUTH_SECRET=
```

`auth.ts` now reads both names for maximum compatibility:
```ts
const secret =
  process.env.NEXTAUTH_SECRET ??
  process.env.AUTH_SECRET ??     // accept old name gracefully
  devFallback();
```

---

### 2. `secret` not passed to `NextAuthOptions` (critical — JWT unsigned)
**File:** `auth.ts`

The `authOptions` object did not include a `secret` field. Without this, next-auth v4
falls back to the environment variable internally — but only if it can find it under
the correct name (`NEXTAUTH_SECRET`). Since bug #1 meant the env var had the wrong
name, the effective secret was `undefined`, causing:

- `[next-auth][warn][NO_SECRET]` warnings in development
- `JWTEncryptionError` crashes in production
- Sessions that couldn't be decoded after any server restart

Fix: explicitly pass `secret` computed from the env var resolution chain into
`authOptions`:

```ts
export const authOptions: NextAuthOptions = {
  secret,           // ← was missing entirely
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  ...
};
```

The `maxAge: 30 * 24 * 60 * 60` (30 days) was also added. Without it, JWT sessions
expire when the browser closes, logging users out constantly.

---

### 3. `signin/page.tsx` — `useSearchParams()` without `<Suspense>` (build error)
**File:** `app/signin/page.tsx`

Next.js 14 App Router requires any component that calls `useSearchParams()` to be
wrapped in a `<Suspense>` boundary. Without it, `next build` throws:

```
Error: useSearchParams() should be wrapped in a suspense boundary at page "/signin"
```

The page was split into `SignInInner` (which calls `useSearchParams`) and
`SignInPage` (the default export, which wraps it in `<Suspense>`). This is the same
pattern already applied to `practice/page.tsx` in v3.

---

### 4. `next.config.mjs` — missing `serverComponentsExternalPackages`
**File:** `next.config.mjs`

MongoDB's Node.js driver uses native bindings and TCP connections that are
incompatible with Next.js's module bundler. Without declaring it as an external
package, the build either fails with bundling errors or produces a silently broken
bundle.

```js
// Before
const nextConfig = {};

// After
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["mongodb"],
  },
};
```

This tells Next.js to leave the `mongodb` import as-is rather than attempting to
bundle it. The package is then resolved at runtime from `node_modules`.

---

### 5. MongoDB connection options — cold-start hangs
**File:** `lib/server/db.ts`

The `MongoClient` was created with no options. On Atlas free tier (M0), the first
connection after a cold start can take 2–8 seconds. Without explicit timeouts,
serverless functions would hang until the platform's own 30-second timeout fired,
returning a 504 to the client.

```ts
// Added
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,  // fail fast if Atlas is unreachable
  socketTimeoutMS: 10000,          // abort slow queries
});
```

With these options, the function fails with a clear 500 (caught by the route's
try/catch) rather than hanging.

---

### 6. `vercel.json` — wrong env var references
**File:** `vercel.json`

The old `vercel.json` referenced `@auth_secret` which does not exist in any Vercel
project. Updated to `@nextauth_secret` and `@nextauth_url`, matching the variable
names documented in `.env.example`.

```json
{
  "env": {
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "@nextauth_url",
    "MONGODB_URI": "@mongodb_uri"
  }
}
```

To set these in Vercel: Dashboard → Project → Settings → Environment Variables.
Then create Vercel secrets with `vercel secrets add nextauth_secret "..."`.

---

### 7. Dev mode crash — no fallback secret
**File:** `auth.ts`

Running `next dev` without a `.env.local` would throw immediately because `secret`
resolved to `undefined`. Added a dev-only fallback:

```ts
const secret =
  process.env.NEXTAUTH_SECRET ??
  process.env.AUTH_SECRET ??
  (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing NEXTAUTH_SECRET ...");
    }
    return "swiftkeys-dev-secret-change-in-production";
  })();
```

The fallback is a fixed string so sessions survive hot-module reloads. It throws
in production so the error is caught at deploy time, not at runtime.

---

## Setup Guide (complete, step by step)

### 1. Clone and install

```bash
git clone https://github.com/yourusername/swiftkeys.git
cd swiftkeys
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_SECRET=your-secret-here

# For local dev, this is always:
NEXTAUTH_URL=http://localhost:3000

# MongoDB Atlas connection string (free tier works fine)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority

# At least one for AI drills
GROQ_API_KEY=your-key
```

### 3. MongoDB Atlas setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → create a free M0 cluster
2. Create a database user (Database Access tab)
3. Allow your IP in Network Access (or `0.0.0.0/0` for Vercel)
4. Get the connection string from Connect → Drivers
5. Paste into `MONGODB_URI`

The app creates all collections and indexes automatically on first request.

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

In the Vercel dashboard, add these environment variables:
- `NEXTAUTH_SECRET` — your generated secret
- `NEXTAUTH_URL` — `https://your-app.vercel.app`
- `MONGODB_URI` — your Atlas connection string
- `GROQ_API_KEY` or `GEMINI_API_KEY` — for AI drills

---

## How the backend works (for reference)

The backend is entirely inside `app/api/`. Every route runs as a Node.js serverless
function. MongoDB is accessed via a global singleton connection promise that persists
across warm invocations of the same function instance.

```
POST /api/submit-test     → saves session, updates key stats, streak, leaderboard
GET  /api/user-stats      → per-key accuracy + latency aggregated across all sessions
GET  /api/streak          → current + longest streak
GET  /api/leaderboard     → top N users by best score
POST /api/analyze-test    → per-session weak/strong key analysis (no DB write)
POST /api/drill           → AI drill generation (Groq → Gemini fallback, Edge runtime)
POST /api/export          → CSV export of local session array (Edge runtime)
```

Auth is handled by NextAuth v4 with a Credentials provider. The "credential" is just
a username — no password, no email. The username is hashed into a deterministic `userId`
and stored in a signed JWT cookie. This makes sign-in frictionless while still giving
each user a stable identity for the database.

---

## Files Changed

| File | Change |
|------|--------|
| `auth.ts` | Added `secret`, `maxAge`, dual env var resolution, dev fallback |
| `.env.example` | Renamed `AUTH_SECRET` → `NEXTAUTH_SECRET`, added `NEXTAUTH_URL` |
| `app/signin/page.tsx` | Wrapped `useSearchParams()` in `<Suspense>` |
| `next.config.mjs` | Added `serverComponentsExternalPackages: ["mongodb"]` |
| `lib/server/db.ts` | Added connection timeout options, expanded comments |
| `vercel.json` | Fixed env var references to match new names |
| `.gitignore` | Added `*.tsbuildinfo` |
| `package.json` | Version bumped to 4.0.0 |
| `docs/CHANGELOG_v4.md` | This file |
