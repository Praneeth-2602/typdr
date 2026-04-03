# ⌨️ SwiftKeys

> A typing platform that actually teaches you. Beginner lessons, per-key analytics, honest WPM scores, and AI-generated drills. Fully serverless — no backend, no database, no account needed.

---

## Why SwiftKeys?

| Problem with Monkeytype | SwiftKeys solution |
|---|---|
| No structured lessons for beginners | Progressive lessons from home row to punctuation |
| Inflated WPM (no punctuation, tiny word list) | Punctuation-inclusive tests, honest WPM display |
| No per-finger / per-key analytics | Full key heatmap + bigram timing breakdown |
| No code practice (just random "coding words") | Real IDE-style code snippets in Python & TypeScript |
| No guided improvement | AI drill generation via Groq / Gemini targeting your weakest keys |
| Requires a server/account | 100% serverless — all analytics in `localStorage` |

---

## Features

### 🎓 Learn
- 5 progressive lessons: Home Row → Top Row → Bottom Row → Numbers → Punctuation
- Interactive keyboard overlay highlighting target keys
- Pass/fail system with WPM & accuracy targets
- Lesson unlocks in sequence to enforce foundations

### ⌨️ Practice
- Modes: **words**, **quotes**, **code snippets**, **custom text**
- Duration: 15s / 30s / 60s / 2 min / unlimited
- Real punctuation in word tests by default
- Honest WPM = corrected characters only (no raw WPM inflation)
- Tab + Enter to restart

### 📊 Analytics
- WPM trend chart (last 30 sessions)
- Per-key accuracy heatmap across all sessions
- Weakest keys ranked with accuracy bars
- Slowest bigrams (consecutive-key timing)
- Consistency score per session
- Session history log

### 🤖 AI Drill Generator
- Calls Groq (Llama 3 8B) or Gemini 1.5 Flash — both free tier
- Generates custom drills targeting your worst keys and slowest bigrams
- Three modes: focused words, natural sentences, or code snippets
- Groq is tried first (faster); Gemini is the fallback

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Charts | Recharts |
| State / Persistence | Zustand + `localStorage` |
| AI (drill gen) | Groq API (Llama 3 8B) + Gemini 1.5 Flash fallback |
| Deployment | Vercel (free tier) |
| Runtime | Edge runtime for the API route |

**Zero database. Zero auth. Zero backend cost.**

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/yourusername/swiftkeys.git
cd swiftkeys
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# At least one is required for AI drill generation
GROQ_API_KEY=your_groq_key_here        # https://console.groq.com  (free)
GEMINI_API_KEY=your_gemini_key_here    # https://aistudio.google.com  (free)
```

> AI drill generation is optional. The rest of the app works without any API keys.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment to Vercel

```bash
npm install -g vercel
vercel
```

Set your environment variables in the Vercel dashboard under **Settings → Environment Variables**:
- `GROQ_API_KEY`
- `GEMINI_API_KEY`

That's it — one command deploy, no database provisioning needed.

---

## Project Structure

```
swiftkeys/
├── app/
│   ├── api/
│   │   └── drill/
│   │       └── route.ts          # Edge API: Groq + Gemini drill generation
│   ├── routes/
│   │   ├── learn/page.tsx        # Lesson system with keyboard overlay
│   │   ├── practice/page.tsx     # Typing test with mode/duration selectors
│   │   └── analytics/page.tsx    # Charts, heatmap, bigrams, AI drills
│   ├── layout.tsx
│   └── page.tsx                  # Landing page
├── components/
│   ├── keyboard/
│   │   └── KeyboardHeatmap.tsx   # Interactive key heatmap + finger colors
│   └── typing/
│       ├── TypingBox.tsx         # Core typing engine component
│       └── ResultCard.tsx        # Post-test result display
├── lib/
│   ├── data/
│   │   ├── corpus.ts             # Word lists, quotes, code snippets, lessons
│   │   └── keyboard.ts           # Key layout + finger assignment data
│   ├── stores/
│   │   └── analytics.ts          # Zustand store with localStorage persistence
│   └── utils/
│       └── engine.ts             # WPM, accuracy, consistency calculations
├── styles/
│   └── globals.css
├── .env.example
├── tailwind.config.ts
└── vercel.json
```

---

## Free API Tiers

| Provider | Model | Free Tier |
|---|---|---|
| [Groq](https://console.groq.com) | Llama 3 8B | 6,000 req/day, ~500K tokens/day |
| [Google Gemini](https://aistudio.google.com) | Gemini 1.5 Flash | 15 req/min, 1M tokens/day |

Both are more than enough for personal or small-team use.

---

## Roadmap

- [ ] Multiplayer race mode (WebSockets via Vercel Edge)
- [ ] Keyboard layout switcher (Dvorak, Colemak)
- [ ] Language packs (Hindi, Japanese romaji)
- [ ] Daily challenge with streak tracking
- [ ] Export analytics as CSV
- [ ] PWA / offline mode

---

## Contributing

PRs welcome. This is designed to be open-source-friendly — no secrets in the codebase, no vendor lock-in, all data stays with the user.

---

## License

MIT

---

## v2 Changes

See [`docs/CHANGELOG_v2.md`](./docs/CHANGELOG_v2.md) for the full breakdown.

**Bug fixes:**
- `Ctrl+Backspace` now deletes exactly one word (was deleting entire input)
- Timer no longer has stale-closure WPM drift
- WPM chunks actually accumulate (was `+= 0` in v1 — consistency score was broken)
- `finish()` is idempotent — sessions are never saved twice
- Hidden input auto-refocuses on blur; clicking anywhere on the test area re-captures keys
- Extra characters capped at 20 to prevent layout explosion
- `Backspace` no longer pollutes per-key analytics
- `calcConsistency` no longer divides by zero on short tests
- `getWeakestKeys` filters out low-volume keys and non-alpha characters
- `getSlowestBigrams` requires ≥ 3 samples before reporting
- `updateLesson` never overwrites a better score with a worse one
- WPM chart Y-axis uses `"auto"` domain — small improvements now visible
- `Tab` key captured — no longer steals focus mid-test

**New features:**
- `Ctrl+Backspace` — delete last word
- `Escape` — instant restart
- Caps Lock warning banner
- Keyboard shortcuts hint bar below the test
- Personal best badge in result card
- WPM trend vs previous 10 sessions
- Accuracy-cost warning when errors significantly reduce WPM
- Day streak counter on analytics page
- `?drill=` query parameter — analytics page "Practice this drill" link lands directly in practice with drill loaded
