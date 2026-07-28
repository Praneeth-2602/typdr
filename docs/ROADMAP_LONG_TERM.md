# typdr — Long-Term Roadmap

> **Scope:** Things that are necessary for typdr to become a mature, defensible product — but are not urgent today. These require more architectural work, potentially a monetization strategy, and real users providing signal.
>
> Don't build any of this until the short and mid-term features have shipped and you have users to validate direction.

---

## 1. AI typing coach (structured training plans)

Right now the AI generates one-off drills. The long-term vision is a **coach** that tracks progress over time and gives you a structured multi-week training program.

### What this looks like

After your first 10 sessions, the coach:
1. Identifies your current level (beginner / intermediate / advanced)
2. Diagnoses your top 3 failure modes (e.g. "left pinky weak", "number row slow", "speed drops mid-paragraph")
3. Generates a 4-week plan with daily 10-minute sessions, each targeting a specific weakness
4. Checks in weekly, adapts the plan based on your progress

### Architecture

- Each session is analyzed server-side and stored
- A weekly cron job (Vercel Cron, free tier) aggregates the past 7 days for each active user and generates a new plan via Groq/Gemini
- Plan stored in MongoDB, surfaced on the user's profile page
- Plan is conversational — user can ask "why am I doing this drill?" and the coach explains

### Why this is long-term

Requires meaningful session data to work well (the model needs 20+ sessions to give useful advice), and it requires prompt engineering work that needs real user feedback to tune. Build it when you have 100+ active users who you can test it with.

---

## 2. Mobile app

typdr on desktop works well. On mobile the hidden-input typing pattern is unreliable. A proper mobile experience requires either a React Native app or a deeply redesigned mobile web experience.

### Option A — React Native (Expo)

Shared logic from `lib/` can be extracted to a shared package. The UI is rebuilt for touch — a large visible text display with a software keyboard that doesn't cover the content. Stats and streaks sync to the same MongoDB backend via the same API routes.

### Option B — Dedicated mobile web mode

Detect mobile on the server side, serve a different layout for `/practice` that:
- Shows only 1 line of text at a time
- Has a large, tappable "next word" button for accessibility
- Works with the virtual keyboard open

### What's uniquely good about mobile typing practice

The use case is different: commute practice, waiting-room drills, 5-minute sessions. Content should be shorter by default (10-word bursts, single sentences). Streaks matter more on mobile because it's the "daily habit" device.

### Why this is long-term

React Native adds a build pipeline, App Store review cycles, and a separate maintenance burden. The web mobile fix should happen in mid-term (a banner + basic usability). The native app is a separate product decision.

---

## 3. Organization / team accounts

For companies that want to use typdr for onboarding, training, or internal competitions.

### What this unlocks

- A team admin creates an org: `typdr.vercel.app/org/acme`
- Invites members via link or email domain whitelist
- Internal leaderboard visible only to org members
- Admin dashboard: which employees have practiced this week, team WPM distribution, slowest keys across the team
- Custom word packs specific to the org (e.g. a medical company adds medical terminology)
- Scheduled "challenges" — "everyone completes 3 sessions this week"

### Data model changes

```ts
interface Organization {
  id: string;
  name: string;
  slug: string;
  adminUserIds: string[];
  memberUserIds: string[];
  customWordPacks: WordPack[];
  createdAt: Date;
}

interface UserProfile {
  // existing fields
  orgId?: string;
  orgRole?: "admin" | "member";
}
```

### Why this is long-term

Org accounts imply billing (a team paying for a product). This needs a payment system, a legal entity, and support infrastructure. It's also a fundamentally different go-to-market motion. Only pursue this if you're ready to productize.

---

## 4. Paid tier + monetization

typdr is free and open-source. That's the right call at this stage. But at scale, MongoDB Atlas, Vercel, and LLM API costs add up.

### Possible monetization models

**Option A — typdr Pro (~$4/month)**

| Feature | Free | Pro |
|---|---|---|
| Practice modes | All | All |
| Session history | Last 50 | Unlimited |
| AI drills | 3/day | Unlimited |
| Themes | 4 presets | All + custom |
| CSV export | Yes | Yes |
| Priority leaderboard | No | Yes |
| Multiplayer rooms | Public only | Private + custom |
| Organization features | No | Yes |

**Option B — Open core (free + hosted)**

Keep the codebase open source. Charge for the hosted version with the above features. Anyone can self-host for free.

**Option C — Sponsorship only**

GitHub Sponsors / Open Collective. Works if the project gets significant OSS traction. Doesn't require building a billing system.

### Implementation (when ready)

- Stripe for payments (`stripe` npm package, `stripe-js` for the frontend)
- A `subscription` collection in MongoDB keyed by `userId`
- Feature flags checked server-side on protected API routes
- Webhook handler at `/api/webhooks/stripe` for subscription lifecycle events

### Why this is long-term

Don't think about monetization until you have organic traffic and users who ask for more. Premature monetization kills OSS projects.

---

## 5. Browser extension

A Chrome/Firefox extension that lets users practice typing on any webpage — highlight text, right-click "Practice this in typdr", and a pop-up typing test opens with that text.

### What this unlocks

- News article typing (real-world sentences)
- Documentation typing (technical content you actually work with)
- Social sharing: "I just typed this NYT article at 74 WPM on typdr"

### Technical approach

- Manifest V3 extension
- Content script: adds a context menu item on text selection
- On click: opens `typdr.vercel.app/practice?text=<selected text>` in a new tab
- OR: injects a typing overlay directly on the page (more complex, more impressive)

### Why this is long-term

Browser extension review cycles are slow (Chrome Web Store can take weeks). Maintenance burden is separate from the main app. Build after the core product is stable.

---

## 6. Competitive seasons

Inspired by games like Rocket League, Fortnite — time-boxed ranked competitions that reset periodically. This creates urgency and retention.

### How it works

- A "season" runs for 1 calendar month
- Users earn points based on daily sessions (wpm × accuracy × sessions_today, capped)
- End-of-season ranks: Bronze / Silver / Gold / Diamond / Champion
- Rank badge shown on profile + leaderboard
- Season resets on the 1st of each month — a new opportunity for everyone

### Why this creates retention

The #1 retention mechanism in any skill-building app is a recurring goal with a deadline. Monthly seasons give users a reason to come back even if they've "mastered" the daily challenge.

### Implementation

- `seasons` collection in MongoDB with start/end dates and rank thresholds
- `season_scores` collection accumulating points per user per season
- A monthly cron job archives the season, awards badges, resets scores
- Season banner on the homepage showing days remaining + user's current rank

---

## 7. Public API

Let developers build on top of typdr data.

### What the API exposes

```
GET  /api/v1/leaderboard          top N global
GET  /api/v1/users/:username      public profile (best WPM, streak, sessions count)
GET  /api/v1/daily                today's challenge text (deterministic)
POST /api/v1/drill                generate a drill (authenticated, rate limited)
```

### Why this is interesting

- Other tools can use the drill endpoint (VS Code extension, terminal app, etc.)
- Aggregator sites can pull the leaderboard
- The daily challenge as a public API is a low-effort high-value feature — other apps could build "word of the day" style integrations

### Auth for the API

API keys, not session cookies. New collection: `api_keys`. User generates a key from their profile page. Rate limits enforced per key.

---

## 8. Hardware keyboard integration

The mechanical keyboard community (the primary audience for typing apps) cares deeply about which keyboard they're using. typdr could be the first typing app to show per-keyboard stats.

### What this means

- User registers their keyboard in their profile (brand, model, switch type)
- Stats are segmented: "your WPM on the Keychron Q1 vs the HHKB"
- Community aggregates: "average WPM by switch type" (do clicky switches make you faster?)
- If the Web HID API matures: detect the connected keyboard automatically

### Why this is long-term

Web HID API for keyboard detection is not widely supported and requires explicit user permission. The manual "register your keyboard" version is simpler but needs enough users to make the data interesting.

---

## 9. Typing certificates

A shareable, verifiable certificate that says "Praneeth typed 95 WPM with 98% accuracy on typdr on [date], verified."

### What this looks like

- After a particularly good test, a "Generate certificate" button appears
- Certificate is a signed PDF or a unique URL: `typdr.vercel.app/cert/abc123`
- The page shows the stats, a timestamp, and a typdr logo
- The certificate is cryptographically signed (HMAC with a server secret) so it can't be faked

### Use cases

- Job applications where typing speed matters (data entry, legal, admin)
- Personal portfolio / "about me" section
- Just fun to share

---

## Technology upgrades to plan for

These aren't features but technical decisions that will be forced by growth:

| Item | When | Why |
|---|---|---|
| **Upgrade to Auth.js v5** | When next-auth v5 is stable | Better OAuth, better TypeScript support |
| **Switch from Zustand to server state** | When sessions > 1000 | localStorage gets slow, sync conflicts arise |
| **Add a CDN for word lists** | At scale | Reduce cold-start latency by serving static JSON from edge |
| **MongoDB → PostgreSQL** | If relational queries get complex | Leaderboard aggregations, season scoring, org analytics |
| **Rate limiting on API routes** | Before public launch | Protect drill endpoint from abuse |
| **E2E tests (Playwright)** | Before v2.0 | Multiplayer, OAuth flows, and race mode are too complex to test manually |
