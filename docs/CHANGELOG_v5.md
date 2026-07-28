# Changelog v5

Roadmap implementation wave (short + mid + feasible long-term).

## Short-term

- Removed `swift-keys.zip`; `.gitignore` blocks `*.zip` / `*.tar.gz`
- Root `README.md` rewritten for typdr + Next.js / MongoDB / NextAuth
- `/profile` with join date, streak, rank, recent sessions, coach panel
- Toast system (no more `alert()`)
- Daily challenge seeded from UTC date
- Loading + global `app/error.tsx` / `app/loading.tsx`
- Leaderboard auto-refresh (60s), current-user highlight, top 50
- Static `/public/og.png` + dynamic `/api/og` score cards + `/share`
- Mobile typing: full-area transparent input + `inputMode="text"`
- `lib/env.ts` startup validation; docs cleaned

## Mid-term

- **Learn overhaul** — 30 lessons, 5 exercise types, LessonMap, hand diagram, metronome
- **Race mode** — MongoDB polling rooms (`/race`, `/race/[code]`)
- Keyboard layouts: QWERTY / Dvorak / Colemak / Colemak-DH / Workman
- Language packs: en, hi (romanized), es, de, ja (romaji)
- Custom + programming word packs on practice
- Themes (8 presets) with CSS-variable Tailwind wiring
- GitHub / Google OAuth providers (env-gated)
- PWA: `manifest.json`, icons, service worker

## Long-term (scaffolded)

- Typing certificates (`/api/cert`, `/cert/[id]`)
- Competitive seasons + cron
- Public API v1: leaderboard, user, daily, drill
- AI coach 7-day plan on profile
- In-memory rate limiting

## Intentionally not built

Native mobile app, org accounts, Stripe monetization, browser extension, hardware keyboard stats — per long-term “wait for users” guidance.
