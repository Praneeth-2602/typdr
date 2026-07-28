# typdr

**type faster. learn smarter.**

A typing platform with progressive lessons, per-key analytics, AI drills, streaks, leaderboards, themes, and multiplayer races.

## Stack

- **Next.js 14** (App Router)
- **MongoDB** (session sync, streaks, XP, leaderboard)
- **NextAuth v4** (username credentials + optional GitHub/Google OAuth)
- **Zustand** (local-first analytics)
- **Framer Motion** + Tailwind CSS

## Quick start

```bash
cd typdr
cp .env.example .env.local
# fill in NEXTAUTH_SECRET and MONGODB_URI at minimum
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXTAUTH_SECRET` | Yes (prod) | NextAuth JWT secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Canonical URL (`http://localhost:3000` locally) |
| `MONGODB_URI` | Yes (for sync) | MongoDB Atlas connection string |
| `MONGODB_DB` | No | Database name (default `typdr`) |
| `GROQ_API_KEY` | For AI drills | Groq / Llama |
| `GEMINI_API_KEY` | For AI drills | Google Gemini |
| `DRILL_PROVIDER` | No | `auto` \| `groq` \| `gemini` |
| `GITHUB_ID` / `GITHUB_SECRET` | No | GitHub OAuth |
| `GOOGLE_ID` / `GOOGLE_SECRET` | No | Google OAuth |
| `CERT_SIGNING_SECRET` | No | Typing certificate HMAC (falls back to `NEXTAUTH_SECRET`) |

See `.env.example` for the full list.

## App routes

| Route | Purpose |
|---|---|
| `/practice` | Words, time, quote, code, daily, custom, language packs |
| `/learn` | 30-lesson curriculum with exercise types |
| `/analytics` | Heatmap, weak keys, streaks, XP |
| `/leaderboard` | Global rankings |
| `/profile` | Account overview |
| `/race` | Multiplayer race lobby |
| `/race/[code]` | Live race room |

## Docs

See [`docs/README.md`](./docs/README.md) for roadmaps and changelogs.

## License

MIT
