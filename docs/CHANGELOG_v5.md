# SwiftKeys v5 — Phase 2: Adaptive Improvement Loops

> This version evolves SwiftKeys from a feedback tool into a personalized,
> habit-forming typing system. The core shift: every session now produces
> action, not just analysis.
>
> Previous history: `CHANGELOG_v2.md`, `CHANGELOG_v3.md`, `CHANGELOG_v4.md`.

---

## Philosophy

Phase 1 answered: *"How did I do?"*

Phase 2 answers: *"What should I do next — and am I getting better?"*

The three pillars of this release:

1. **XP + Levels** — every session yields a tangible reward. Progress is visible,
   cumulative, and persistent across devices.
2. **Background Job Queue** — heavy work (drill pre-warming, leaderboard rank
   recalculation) is decoupled from the request path so the UI never waits on it.
3. **Cached Drill Recommendation** — by the time a user opens the analytics page
   after finishing a session, a personalized AI drill is already waiting for them.

---

## Architecture Changes

### Queue Layer

A lightweight dual-mode job queue was added at `lib/queue.ts`.

```
Client → POST /api/submit-test
              ↓
         submitTest() [fast — DB writes only]
              ↓
         enqueueJob() [fire-and-forget]
              ↓
    ┌─────────────────────────┐
    │  UPSTASH_URL set?       │
    │  Yes → Upstash Redis    │
    │  No  → in-process async │
    └─────────────────────────┘
              ↓
         lib/worker/handlers.ts
```

When `UPSTASH_URL` and `UPSTASH_TOKEN` are set, jobs are pushed to an Upstash
Redis list and can be consumed by a standalone worker process — the path to true
background processing for high-traffic deployments.

When those variables are absent (local dev, simple deployments), jobs execute
in-process via an async fire-and-forget queue. The API response is not held up
either way. The app works with zero configuration changes.

This design means you can start simple and upgrade to real Redis later by adding
two environment variables — no code changes required.

### Job Handlers

Three handlers live in `lib/worker/handlers.ts`:

| Job type | What it does |
|---|---|
| `generate-drill-cache` | Calls Groq/Gemini with the user's weak keys, writes the result to `userStats.cachedDrill` in MongoDB |
| `update-leaderboard` | Bulk-writes a `rank` field across all leaderboard documents after any score changes |
| `send-streak-reminder` | Stub — interface ready for Resend/Novu when notification infrastructure is added |

---

## New Features

### 1. XP / Level System

**Files:** `lib/server/db.ts`, `components/gamification/XpBar.tsx`,
`components/gamification/XpResultPanel.tsx`

Every completed session earns XP. The formula:

```
xp = wpm × (accuracy / 100) × 0.1
   + 10% consistency bonus if consistency ≥ 80
```

A 60 WPM / 95% accuracy run earns ~5 XP. A 100 WPM / 99% / consistency 85 run
earns ~11 XP. The numbers are intentionally modest — this is a long-term progression
system, not instant gratification.

**Level thresholds** grow by 15% per level, starting at 100 XP for the first
level-up:

| Level | XP required (total) |
|-------|---------------------|
| 1     | 0                   |
| 2     | 100                 |
| 3     | 215                 |
| 4     | 347                 |
| 5     | 499                 |
| 10    | 1,711               |

The math is pure and stateless — `xpForLevel(n)` and `levelFromXp(xp)` are
exported functions with no database dependency, so they can be called anywhere
without async overhead.

**Level titles** give each bracket a name:

```
1 Novice → 2 Apprentice → 3 Typist → 4 Swift → 5 Fluent
→ 6 Adept → 7 Expert → 8 Master → 9 Grandmaster → 10 Legendary
```

**Level color tiers** visually communicate progression:

```
1–2  →  brand yellow  (default)
3–4  →  sky blue
5–6  →  emerald
7–8  →  violet
9+   →  amber  (legendary glow)
```

**`UserStatsDocument`** was extended with `xp: number` and `level: number` fields.
Both are backfill-safe — the `submitTest` function reads `existingStats?.xp ?? 0`
so users who have existing sessions get their XP correctly computed from their next
test forward.

#### XpBar component

`components/gamification/XpBar.tsx` is the primary display component. It renders:

- A level badge (number + title)
- An animated progress bar with a shimmer sweep effect
- XP progress label (`earned / span XP`, `% to next level`)
- A `+N XP` gain flash (shown when `xpGained` prop is provided)
- A level-up burst overlay — radial glow + spring-animated "⚡ LEVEL UP!" text
  that plays when `leveledUp` is true

The component has a `compact` prop for inline use inside the `ResultCard` bento
grid and a full-size variant for the analytics page standalone display.

#### XpResultPanel component

`components/gamification/XpResultPanel.tsx` is a composite post-test panel that
combines:

- `XpBar` (full variant, with `xpGained` and `leveledUp` props from the API response)
- A streak badge (`🔥 N-day streak — keep it going!`) when streak > 1
- A one-line XP summary (`+N XP earned this session · leveled up to N!`)

This panel slots into the `ResultCard` bento grid as a new "Progress" section,
appearing only for authenticated users after server sync completes.

---

### 2. Post-test Progress Panel in ResultCard

**File:** `components/typing/ResultCard.tsx`

A new `syncedXp?: XpGainResult | null` prop was added to `ResultCardProps`.
When provided, `XpResultPanel` renders as a full-width bento section between the
coach feedback block and the weak keys block.

The weak keys block was also adjusted from `md:col-span-4` to share the row
with the XP panel (`md:col-span-4` + `md:col-span-8`), keeping the grid dense.

The XP panel only renders for signed-in users — unauthenticated sessions see no
change to the result card layout.

---

### 3. Analytics Page: XP Bar + Drill Recommendation

**File:** `app/analytics/page.tsx`

Two new panels were added below the 6-stat grid on the analytics page.

**XP bar** — a full-size `XpBar` pulling `xp`, `level`, `xpForCurrentLevel`, and
`xpForNextLevel` from the updated `/api/user-stats` response. Renders only for
authenticated users. Animates in with a fade/slide on page load.

**🔥 Recommended Drill panel** — displays the cached AI drill generated after the
user's last session. Structure:

```
┌──────────────────────────────────────────────────────────┐
│  🔥 RECOMMENDED DRILL          targets: [e] [t] [r]      │
│                                                           │
│  letter better enter tether intent extent element...      │
│                                                           │
│  [ ⚡ Practice this drill → ]                            │
└──────────────────────────────────────────────────────────┘
```

The "Practice this drill" button deep-links to `/practice?drill=<encoded text>`,
which the practice page already handles via its `drillParam` effect. No new routing
was needed.

The panel does not appear until `cachedDrill` is populated — which happens
asynchronously after the user's first post-v5 submission. On the very first
session after upgrading, the panel is absent; from the second session onward it
is always pre-warmed.

---

### 4. New API Endpoints

#### `GET /api/xp`

A lightweight endpoint that returns only XP state — useful for header widgets or
nav-level level badges without pulling the full user stats payload.

```json
{
  "xp": 312,
  "level": 4,
  "xpForCurrentLevel": 347,
  "xpForNextLevel": 499,
  "sessionsCompleted": 41
}
```

#### `GET /api/user-stats` (extended)

Now returns four additional fields alongside the existing response:

```json
{
  "xp": 312,
  "level": 4,
  "xpForCurrentLevel": 347,
  "xpForNextLevel": 499,
  "cachedDrill": {
    "text": "letter better enter tether...",
    "mode": "words",
    "weakKeys": ["e", "t", "r"],
    "generatedAt": "2025-04-03T..."
  }
}
```

Both endpoints are backward-compatible — clients that don't read the new fields
are unaffected.

#### `POST /api/submit-test` (extended response)

The response now includes an `xp` field:

```json
{
  "weakKeys": [...],
  "strongKeys": [...],
  "feedback": [...],
  "streak": {...},
  "leaderboard": {...},
  "xp": {
    "xpGained": 7,
    "xpTotal": 319,
    "level": 4,
    "leveledUp": false,
    "prevLevel": 4,
    "xpForCurrentLevel": 347,
    "xpForNextLevel": 499
  }
}
```

---

## Database Changes

### `user_stats` collection

Two new fields added to every document:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `xp` | `number` | `0` | Cumulative XP across all sessions |
| `level` | `number` | `1` | Derived from `xp` but stored for fast reads |

One new field added dynamically by the worker:

| Field | Type | Notes |
|-------|------|-------|
| `cachedDrill` | `object` | Written by `generate-drill-cache` job. Contains `text`, `mode`, `weakKeys[]`, `generatedAt` |

No migration is required. Existing documents without `xp`/`level` resolve to
`0` and `1` via nullish coalescing. The `cachedDrill` field simply won't exist
until the user submits their first post-v5 session.

### `leaderboard` collection

A `rank` field is now bulk-written by the `update-leaderboard` worker job after
every submission. It stores the user's ordinal position by `bestScore`. This
field is advisory — the leaderboard API still sorts by score at query time —
but it enables future rank-change notifications and badge displays without a
separate sort operation.

---

## Environment Variables

Two new optional variables:

```env
# Phase 2: Background Job Queue
# If set, jobs are pushed to Upstash Redis for durable async processing.
# If unset, jobs run in-process — works fine for small deployments.
UPSTASH_URL=
UPSTASH_TOKEN=
```

Both are optional. The app degrades gracefully to in-process async when absent.
To get an Upstash Redis instance: https://console.upstash.com (free tier, no
credit card).

---

## Files Changed

| File | Change |
|------|--------|
| `lib/server/db.ts` | XP math functions, `XpGainResult` interface, `xp`/`level` on `UserStatsDocument`, `submitTest` computes + persists XP, returns `xp` in response |
| `lib/queue.ts` | *(new)* Dual-mode job queue — Upstash Redis or in-process fallback |
| `lib/worker/handlers.ts` | *(new)* `generate-drill-cache`, `update-leaderboard`, `send-streak-reminder` handlers |
| `app/api/xp/route.ts` | *(new)* `GET /api/xp` endpoint |
| `app/api/submit-test/route.ts` | Enqueues `generate-drill-cache` + `update-leaderboard` after every submission |
| `app/api/user-stats/route.ts` | Returns `xp`, `level`, `xpForCurrentLevel`, `xpForNextLevel`, `cachedDrill` |
| `components/gamification/XpBar.tsx` | *(new)* Animated XP bar with level titles, color tiers, shimmer, level-up burst |
| `components/gamification/XpResultPanel.tsx` | *(new)* Post-test XP + streak composite panel |
| `components/typing/ResultCard.tsx` | `syncedXp` prop, `XpResultPanel` rendered in bento grid |
| `app/practice/page.tsx` | `syncedXp` state, cleared on reset, populated from API, passed to `ResultCard` |
| `app/analytics/page.tsx` | `serverXp` + `serverCachedDrill` state, XP bar + drill recommendation panels |
| `.env.example` | `UPSTASH_URL` and `UPSTASH_TOKEN` documented |
| `package.json` | Version bumped to 5.0.0 |
| `docs/CHANGELOG_v5.md` | This file |

---

## What's Next (Phase 3 ideas)

- **Streak reminders** — the `send-streak-reminder` handler is stubbed and ready.
  Wire up [Resend](https://resend.com) or [Novu](https://novu.co) to send a push
  or email when a user's streak is at risk (hasn't typed by 9 PM local time).
- **XP history chart** — add a second y-axis to the analytics line chart showing
  cumulative XP over time alongside WPM.
- **Level badge in the nav** — a small `Lv N` pill next to the username in the
  top nav, pulling from `GET /api/xp` on mount.
- **Standalone worker process** — a `worker/index.ts` entry point that polls
  Upstash and dispatches jobs in a separate Node.js process, enabling true
  background compute decoupled from the serverless function lifecycle.
- **Drill history** — store past drills in `userStats.drillHistory[]` and show a
  carousel on the analytics page so users can revisit previous recommendations.
- **Achievement system** — milestone badges ("First 100 WPM", "7-day streak",
  "Reach Level 5") stored per-user and displayed on the analytics page.
