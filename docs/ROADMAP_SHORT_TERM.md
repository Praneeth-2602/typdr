# typdr — Short-Term Roadmap

> **Scope:** Things that are broken, missing, or embarrassing right now.
> These should all be done before pushing for any public attention.
> Estimated effort: 1–2 weeks of focused work.

---

## 1. Repo hygiene (do first, today)

### 1.1 Remove `swift-keys.zip` from the repo
The old zip file is committed to `main`. It adds ~80 KB of dead weight to every clone and exposes previous project names.

```bash
git rm swift-keys.zip
git commit -m "chore: remove stale swift-keys.zip from repo"
```

### 1.2 Update the README
The current `README.md` still says **SwiftKeys** throughout — wrong name, wrong architecture description (says "zero database, zero auth" which is no longer true). Needs a full rewrite to reflect:
- The `typdr` name and description
- The actual current stack (Next.js + MongoDB + NextAuth)
- Correct env var names (`NEXTAUTH_SECRET`, not `AUTH_SECRET`)
- Correct setup instructions referencing the `typdr` folder

### 1.3 Add a `.gitignore` rule for zip files
Prevent this from happening again.

```gitignore
# build artifacts / zips
*.zip
*.tar.gz
```

---

## 2. Auth UX — profile page

**What's missing:** Users can sign in but there's nowhere to go after. There's no `/profile` or `/me` page. The nav has no indication that you're signed in beyond the AuthButtons component.

**What to build:**

- `/profile` page showing:
  - Username + join date
  - All-time stats (total sessions, best WPM, avg accuracy, total time typed)
  - Streak display (current + longest)
  - Leaderboard rank
  - Recent sessions table (last 20)
  - Link to full analytics

- Nav bar updates:
  - When signed in: show username + link to `/profile`
  - When signed out: show "Sign in" button

**Files to touch:** `app/profile/page.tsx` (new), `components/auth/AuthButtons.tsx`, all nav bars in page files.

---

## 3. Error boundaries and loading states

Right now if MongoDB is unreachable, API routes return 500s that surface as unhandled promise rejections in the UI with no feedback. Every page that fetches from an API route needs:

- A loading skeleton while the request is in flight
- A non-crashing error state when the request fails
- Graceful fallback to local data (localStorage) when the backend is down

**Specific gaps:**

| Page | Missing |
|---|---|
| `analytics/page.tsx` | No loading state while fetching `/api/user-stats` |
| `practice/page.tsx` | AI drill errors swallowed by bare `alert()` — replace with toast |
| `leaderboard` | Doesn't exist as a page yet — leaderboard data is fetched but never displayed |

---

## 4. Leaderboard page

The backend (`/api/leaderboard`) is fully implemented but there's no frontend page. It's the most shareable feature and it's invisible.

**What to build:** `/leaderboard` page showing:
- Top 50 users ranked by best score (WPM × accuracy)
- Columns: rank, username, best score, avg WPM, avg accuracy, total sessions
- Current user's row highlighted (even if outside top 50)
- Auto-refreshes every 60s

---

## 5. Fix the daily challenge seeding

The current daily challenge uses a client-side LCG seeded by local date. This means:
- Users in different timezones get different challenges
- The challenge changes at midnight *local* time, not UTC

**Fix:** seed from UTC date. One-line fix in `lib/data/corpus.ts`:

```ts
// Before (wrong — uses local date)
const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

// After (correct — UTC)
const now = new Date();
const seed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
```

---

## 6. Replace bare `alert()` calls with a toast system

There are multiple `alert("...")` calls in `practice/page.tsx` and `analytics/page.tsx`. These are blocking, un-styled, and look terrible on mobile.

**What to add:** A minimal toast component (no library needed — ~40 lines of Tailwind + Framer Motion) that slides in from the bottom-right. Wire it to a Zustand slice or a simple React context.

Calls to replace:
- `alert("Check your GROQ_API_KEY or GEMINI_API_KEY in .env.local.")`
- `alert("Export failed")`
- `alert("Failed to generate drill")`
- `alert(data.error ?? "Failed to generate drill")`

---

## 7. Open Graph / social preview

Right now sharing a typdr link on Twitter/Discord/WhatsApp shows no preview card — just the URL. This is a missed virality opportunity every time someone shares their score.

**What to add:**

- Static OG image at `public/og.png` (1200×630) — dark background, typdr logo, tagline
- Dynamic OG image route at `app/api/og/route.tsx` using `@vercel/og` for score-share cards:
  - "I just typed 87 WPM on typdr" with accuracy and mode shown
  - Link with query params: `/api/og?wpm=87&accuracy=96&mode=words`

The dynamic route is ~30 lines using the `@vercel/og` Edge function.

---

## 8. Typing area on mobile is broken

The hidden `<input>` pattern doesn't work reliably on iOS Safari — the virtual keyboard doesn't open. Tapping the typing area does nothing.

**Fix options (in order of effort):**

1. Add `inputMode="text"` to the hidden input and ensure the `onClick` handler on the container calls `.focus()` explicitly (quick fix, may not fully solve iOS)
2. Replace the hidden input with a `contentEditable` div (more work, solves the problem completely)
3. Add a "Mobile mode" toggle that shows a visible standard textarea and overlays the styled character display on top (middle ground)

At minimum, add a banner on small screens: "typdr works best on desktop. mobile support coming soon."

---

## 9. Docs folder cleanup

The `docs/` folder currently has:
- `CHANGELOG_v2.md`
- `CHANGELOG_v3.md`
- `CHANGELOG_v4.md`
- `swiftkeys_concept_board.html` (an old HTML concept file with wrong name)

**What to do:**
- Delete `swiftkeys_concept_board.html`
- Rename changelogs to `CHANGELOG.md` with version sections, or keep them split — either way, add a `docs/README.md` index explaining what each file is
- Add this file (`ROADMAP_SHORT_TERM.md`) and its siblings to the docs folder

---

## 10. Environment variable validation on startup

Currently the app crashes at *request time* when env vars are missing, giving confusing errors. It should crash at *startup time* with a clear message.

**What to add:** `lib/env.ts` — a validation module imported at the top of any server-side file:

```ts
// lib/env.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  MONGODB_URI:     requireEnv("MONGODB_URI"),
  GROQ_API_KEY:    process.env.GROQ_API_KEY ?? "",
  GEMINI_API_KEY:  process.env.GEMINI_API_KEY ?? "",
};
```

---

## Priority order

| Priority | Item | Effort |
|---|---|---|
| 🔴 Now | Remove `swift-keys.zip`, update README | 30 min |
| 🔴 Now | Fix daily challenge UTC seed | 5 min |
| 🔴 Now | Replace `alert()` with toasts | 2 hrs |
| 🟠 This week | Profile page | 4 hrs |
| 🟠 This week | Leaderboard page | 3 hrs |
| 🟠 This week | Error boundaries + loading states | 3 hrs |
| 🟡 Soon | OG image / social preview | 2 hrs |
| 🟡 Soon | Mobile typing area fix | 3 hrs |
| 🟡 Soon | Env validation module | 1 hr |
| 🟡 Soon | Docs cleanup | 30 min |
