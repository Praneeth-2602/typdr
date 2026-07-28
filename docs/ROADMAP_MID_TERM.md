# typdr — Mid-Term Roadmap

> **Scope:** The next meaningful feature set after the short-term fixes land.
> These features grow the product from "typing app" to "typing platform."
> Each item is self-contained enough to be built incrementally.
> Estimated timeline: 1–3 months.

---

## 1. Multiplayer race mode

The single most shareable feature a typing app can have. You race friends (or strangers) in real time and see their cursor moving through the same text.

### Architecture

Vercel doesn't support persistent WebSocket connections on serverless functions, so two options:

**Option A — Vercel + Ably/Pusher (recommended)**
Use a managed real-time service. Free tiers are sufficient for early-stage traffic.
- Ably free tier: 6M messages/month
- Client subscribes to a channel keyed by room code
- Server publishes progress events via REST (works from serverless functions)
- No infra to manage

**Option B — Separate WebSocket server (Railway/Fly.io)**
A standalone Node.js process with `ws` or `socket.io`. More control, more maintenance. Worth doing if you want to avoid the real-time service dependency long-term.

### UX flow

1. User clicks "Race" → creates a room → gets a 6-character code (e.g. `T4YPD9`)
2. Share the code or link (`typdr.vercel.app/race/T4YPD9`)
3. Room shows a lobby (waiting for players) — up to 8 players
4. Countdown `3… 2… 1… go`
5. Race view: each player's username appears as a cursor moving through the shared text
6. Finish order shown at the end with WPM + accuracy for each player
7. Room persists for 5 minutes after last player finishes (for rematch)

### Data model

```ts
interface RaceRoom {
  code: string;
  text: string;
  status: "waiting" | "countdown" | "racing" | "finished";
  players: {
    userId: string;
    username: string;
    progress: number; // index in text
    wpm: number;
    finished: boolean;
    finishedAt?: number;
  }[];
  createdAt: number;
  expiresAt: number;
}
```

### New files needed
- `app/race/page.tsx` — lobby + race UI
- `app/race/[code]/page.tsx` — specific room
- `app/api/race/create/route.ts`
- `app/api/race/[code]/route.ts`
- `hooks/useRace.ts` — real-time subscription logic

---

## 2. Keyboard layout switcher

A significant portion of the "learn to type properly" audience uses or wants to learn Dvorak, Colemak, or Workman. Right now typdr is QWERTY-only.

### What to add

- Layout selector in practice settings: `QWERTY` | `Dvorak` | `Colemak` | `Colemak-DH` | `Workman`
- The selector changes two things:
  1. **Keyboard heatmap rendering** — keys displayed in the selected layout order
  2. **Lesson content** — home row lesson for Colemak is `ARSTDHNEIO`, not `ASDFHJKL;`
- Layout preference persisted to localStorage and user profile

### Layout data

Each layout is a static mapping of key → position. Define in `lib/data/keyboard.ts`:

```ts
export const LAYOUTS = {
  qwerty:    { /* current */ },
  dvorak:    { /* a o e u i d h t n s */ },
  colemak:   { /* a r s t d h n e i o */ },
  colemakDh: { /* variation */ },
  workman:   { /* a s h t g y n e o i */ },
} as const;

export type Layout = keyof typeof LAYOUTS;
```

The typing engine itself doesn't change — it compares typed characters to expected characters regardless of physical layout. The layout setting only affects what the keyboard diagram shows.

---

## 3. Language packs

Typing in English only limits the audience. Hindi, Spanish, German, French, and Japanese romaji are high-value targets given the Indian-origin project.

### Implementation

Word lists per language stored in `lib/data/languages/`. Each pack is:

```ts
interface LanguagePack {
  code: string;         // "hi", "es", "de"
  name: string;         // "Hindi (Romanized)"
  wordList: string[];   // 200-500 common words
  sampleQuotes: { text: string; author: string }[];
  rtl: boolean;         // for future Arabic/Hebrew support
}
```

For **Hindi**, use Romanized (transliterated) Hindi — this avoids needing a different keyboard entirely. Words like `paani`, `ghar`, `kaam`, `log`, `din`. This targets the massive Indian audience who think in Hindi but type in Roman script.

For **Japanese romaji**, similarly — `watashi`, `desu`, `arigatou`, `sakura`. Fun and accessible without requiring IME.

### Language selector

Small flag/code selector in the practice toolbar next to mode selector. Preference persisted per user.

---

## 4. Learn tab — full overhaul

> **Current state:** 5 static lessons with 4 text samples each. No exercise variety, no
> visual instruction, no finger placement guidance, no pacing tools, no structured
> progression. A complete beginner who opens the learn tab gets almost nothing useful.
> This is the weakest part of the product given that "teaches you to type" is in the tagline.

### 4.1 What the learn tab needs to become

A self-contained curriculum that takes someone from zero typing ability to 60+ WPM, with:

- A visible **progress map** (not just a linear list)
- Multiple **exercise types** per lesson, not just free-text typing
- **Finger placement diagrams** for every lesson
- A **metronome/pacing mode** for speed building
- **Unlock gates** with clear pass criteria
- **Lesson-level analytics** so the user knows exactly which key in each lesson is holding them back

---

### 4.2 Curriculum — full lesson tree

The current 5 lessons become 30 lessons across 4 phases. Each lesson has a clear goal, target keys, and specific exercises.

#### Phase 1 — Foundation (10 lessons)

These replace and expand the current 5 lessons. Lessons are split by hand to isolate learning.

| ID | Title | Target keys | Goal |
|---|---|---|---|
| `f-01` | Left home row | `a s d f` | Both hands aren't needed yet. Just left. |
| `f-02` | Right home row | `j k l ;` | Mirror of f-01. |
| `f-03` | Both home rows | `a s d f j k l ;` | First time using both hands together. |
| `f-04` | Left top row | `q w e r` | Reach up with left hand only. |
| `f-05` | Right top row | `u i o p` | Reach up with right hand only. |
| `f-06` | Top row combined | `q w e r t y u i o p` | Full top row, both hands. |
| `f-07` | Left bottom row | `z x c v` | Reach down with left hand. |
| `f-08` | Right bottom row | `n m , .` | Reach down with right hand. |
| `f-09` | Full alphabet | `a–z` | Every letter, all rows. First complete test. |
| `f-10` | Shift + capitals | `A–Z` via shift | Introduces pinky shift. Both left and right shift. |

#### Phase 2 — Accuracy (8 lessons)

Accuracy before speed. Each lesson is deliberately slow — the user cannot advance unless they hit 95%+ accuracy. WPM target is low (15–20). The goal is clean form, not pace.

| ID | Title | Focus |
|---|---|---|
| `a-01` | Common digraphs | `th` `he` `in` `er` `an` `re` `on` `at` |
| `a-02` | Common trigraphs | `the` `and` `ing` `ion` `ent` `for` `her` |
| `a-03` | Short common words | `the` `be` `to` `of` `and` `a` `in` `is` `it` |
| `a-04` | Numbers row | `1 2 3 4 5 6 7 8 9 0` |
| `a-05` | Number + word combos | Realistic sequences: `42 items` `3rd` `2024` `v2.0` |
| `a-06` | Punctuation basics | `. , ; : ! ?` in natural sentence context |
| `a-07` | Apostrophes + quotes | `it's` `don't` `"hello"` `'world'` |
| `a-08` | Brackets + symbols | `( ) [ ] { } < >` — essential for code typing |

#### Phase 3 — Speed (7 lessons)

The metronome is introduced here. Each lesson sets a target pace (e.g. 1 keystroke per beat at 60 BPM = 60 KPM). Users type to the beat. If they fall behind, the text yellows. If they go ahead, they wait.

| ID | Title | Metronome BPM | Focus |
|---|---|---|---|
| `s-01` | Paced home row | 60 BPM | Muscle memory at consistent speed |
| `s-02` | Paced common words | 70 BPM | Rhythm across word boundaries |
| `s-03` | Paced sentences | 80 BPM | Sustaining pace through punctuation |
| `s-04` | Burst training | 100 BPM, 10s bursts | Short max-effort intervals |
| `s-05` | Long-form endurance | 70 BPM, 3 minutes | Maintaining consistency over time |
| `s-06` | Weak key targeting | Personalized | Pulls your 3 weakest keys from analytics |
| `s-07` | Speed test baseline | No metronome | Free test — measures improvement from Phase 1 entry |

#### Phase 4 — Real-world typing (5 lessons)

Content that looks like what people actually type at work, not random word lists.

| ID | Title | Content |
|---|---|---|
| `r-01` | Email writing | "Hi team, just a heads up that the meeting…" — natural prose |
| `r-02` | Slack / chat | Short messages, emoji-free, casual punctuation |
| `r-03` | Code identifiers | `camelCase` `snake_case` `SCREAMING_SNAKE` `kebab-case` `.tsx` `.env` |
| `r-04` | Terminal commands | `git commit -m "fix"` `npm install` `cd ../` `ls -la` |
| `r-05` | Full simulation | Mixed content: prose → code → numbers → punctuation, no breaks |

---

### 4.3 Exercise types

Every lesson currently uses a single exercise type: "type this text." That's not how any skill is taught. The new curriculum introduces 5 exercise types:

**Type A — Copy drill** *(current, keep)*
User reads a line and types it exactly. Good for introducing new keys.

**Type B — Guided key drill**
A single key or pair flashes on the keyboard diagram. User presses it. Repeat 20 times with timing feedback. No full words — pure key-to-finger mapping.

```
Example: Lesson f-01, exercise 1
Keyboard diagram shows 'f' highlighted on left index.
Screen shows: "Press f"
User presses f → green flash, next prompt
```

**Type C — Word reveal**
Words appear one at a time, center-screen, large text. User types each word then hits space to advance. No looking at a sentence — focus is on individual words.

**Type D — Metronome pace**
A BPM counter ticks. The cursor advances at the beat. User must type each character exactly when the beat fires. Visual: the current character pulses on the beat.

**Type E — Blind typing**
Typed characters are hidden (shown as `•`). Accuracy-only feedback at the end. Forces reliance on feel, not visual correction. Unlocked after Phase 2.

---

### 4.4 Finger placement diagram

The current keyboard overlay just highlights which keys to use. It does not show which **finger** should press them.

Every Phase 1 lesson needs an animated finger diagram:

- Illustration of two hands (SVG, inline, dark-themed to match the UI)
- Fingers labeled: left pinky, left ring, left middle, left index, right index, right middle, right ring, right pinky
- When a key is the target, the corresponding finger lights up in the same color used on the keyboard heatmap (already defined in `lib/data/keyboard.ts` as `FINGER_COLORS`)
- On mobile: a simplified "left / right, which finger" text callout instead of the illustration

The SVG hand diagram should live in `components/learn/HandDiagram.tsx`. It doesn't need to be a photo-realistic hand — a simple top-down schematic works. The 10 fingers are 10 rounded rectangles in two groups of 5.

---

### 4.5 Lesson progress map (UI)

Replace the current flat vertical list with a branching progress map — similar to how Duolingo shows lessons but without the gamification excess.

Layout on `/learn`:

```
Phase 1 — Foundation          Phase 2 — Accuracy
  ○ f-01 Left home row    →     ○ a-01 Digraphs
  ○ f-02 Right home row   →     ○ a-02 Trigraphs
  ○ f-03 Both home rows         ...
  ...

Phase 3 — Speed               Phase 4 — Real-world
  ○ s-01 Paced home row   →     ○ r-01 Email
  ...                           ○ r-05 Full simulation
```

Each node is:
- 🔒 Locked — previous lesson not passed
- ○ Available — can start
- ◑ In progress — started but not passed (shows best WPM / accuracy)
- ✓ Complete — passed, shows best score and star rating (1–3 stars based on WPM vs target)

The progress map is read from the user's `lessonProgress` in the Zustand store (already exists). No new backend needed for this.

---

### 4.6 Lesson-level analytics panel

After completing any lesson, a results panel shows:

- WPM vs target WPM
- Accuracy vs target accuracy
- **Per-key breakdown for the lesson's target keys** — e.g. for `f-03 Both home rows`, show accuracy for each of `a s d f j k l ;` individually
- Slowest key in this lesson (with a "drill this key" button that generates an AI drill targeting it)
- Star rating: 1 star = passed, 2 stars = 110% of target WPM, 3 stars = 130% of target WPM
- "Next lesson" button (only visible if passed)

---

### 4.7 Metronome implementation

The metronome is a pure Web Audio API oscillator — same pattern as `useSound.ts`:

```ts
// hooks/useMetronome.ts
export function useMetronome(bpm: number, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const nextBeatRef = useRef<number>(0);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880; // high A — short, punchy
    gain.gain.setValueAtTime(0.15, nextBeatRef.current);
    gain.gain.exponentialRampToValueAtTime(0.001, nextBeatRef.current + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(nextBeatRef.current);
    osc.stop(nextBeatRef.current + 0.05);
    nextBeatRef.current += 60 / bpm;
  }, [bpm]);

  useEffect(() => {
    if (!enabled) return;
    ctxRef.current = new AudioContext();
    nextBeatRef.current = ctxRef.current.currentTime;
    schedulerRef.current = setInterval(tick, (60 / bpm) * 1000 * 0.9); // schedule ahead
    return () => {
      clearInterval(schedulerRef.current!);
      ctxRef.current?.close();
    };
  }, [bpm, enabled, tick]);
}
```

In the `TypingBox`, when metronome mode is active: each beat fires and if the user hasn't typed the current character yet, the character and cursor pulse red. If they type ahead of the beat, they wait for the next beat before the cursor advances.

---

### 4.8 Data structure — updated

The existing `Lesson` type in `lib/data/corpus.ts` needs to be replaced:

```ts
type ExerciseType = "copy" | "guided-key" | "word-reveal" | "metronome" | "blind";

interface LessonExercise {
  type: ExerciseType;
  content: string | string[];   // string for copy/blind, string[] for word-reveal/guided-key
  bpm?: number;                 // metronome only
  targetWpm?: number;           // override lesson default for this exercise
  targetAccuracy?: number;
  instructions?: string;        // short tip shown above the exercise
}

interface Lesson {
  id: string;
  phase: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  targetKeys: string[];          // keys highlighted on the diagram
  targetFingers: Finger[];       // fingers lit up on the hand diagram
  targetWpm: number;
  targetAccuracy: number;
  exercises: LessonExercise[];
  unlocksAfter: string | null;   // lesson id, or null for phase openers
  estimatedMinutes: number;      // shown on the lesson card
}
```

---

### 4.9 Files to create / modify

| File | Action | Purpose |
|---|---|---|
| `lib/data/curriculum.ts` | **New** | All 30 lesson definitions with full exercise content |
| `components/learn/HandDiagram.tsx` | **New** | SVG two-hand diagram with per-finger highlighting |
| `components/learn/LessonMap.tsx` | **New** | Progress map UI (replaces the flat list) |
| `components/learn/LessonRunner.tsx` | **New** | Orchestrates exercises within a lesson (type A–E) |
| `components/learn/ExerciseCopy.tsx` | **New** | Type A — copy drill (refactored from current TypingBox) |
| `components/learn/ExerciseGuidedKey.tsx` | **New** | Type B — single-key flash drill |
| `components/learn/ExerciseWordReveal.tsx` | **New** | Type C — one word at a time |
| `components/learn/ExerciseMetronome.tsx` | **New** | Type D — paced typing with beat |
| `components/learn/ExerciseBlind.tsx` | **New** | Type E — hidden characters |
| `components/learn/LessonResult.tsx` | **New** | Post-lesson analytics panel |
| `hooks/useMetronome.ts` | **New** | Web Audio metronome (see 4.7) |
| `app/learn/page.tsx` | **Rewrite** | New progress map layout, lesson runner modal/page |
| `app/learn/[id]/page.tsx` | **New** | Individual lesson route |
| `lib/data/corpus.ts` | **Edit** | Remove old `LESSONS` array, import from `curriculum.ts` |

---

### 4.10 Milestone definition — "learn tab is done"

The learn tab can be considered complete when:

- [ ] All 30 lessons exist with full exercise content written
- [ ] All 5 exercise types are implemented and working
- [ ] Hand diagram shows correct finger for every lesson
- [ ] Progress map renders correctly (locked / available / complete states)
- [ ] Metronome mode plays audio and paces the cursor
- [ ] Lesson result panel shows per-key breakdown
- [ ] A complete beginner can go from lesson 1 to lesson 30 without any other instruction
- [ ] Each lesson has been manually playtested and the WPM targets are achievable

---

## 5. GitHub / Google OAuth

The current auth is username-only (no password, no email). This is great for frictionless sign-in but bad for account recovery — if you forget your username exactly, you lose your data.

### What to add

- **GitHub OAuth** — natural fit for the developer-focused audience
- **Google OAuth** — broader coverage

Implementation in NextAuth is straightforward:

```ts
// auth.ts — add to providers array
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

providers: [
  GitHub({ clientId: env.GITHUB_ID, clientSecret: env.GITHUB_SECRET }),
  Google({ clientId: env.GOOGLE_ID, clientSecret: env.GOOGLE_SECRET }),
  Credentials({ /* existing username provider */ }),
]
```

New env vars: `GITHUB_ID`, `GITHUB_SECRET`, `GOOGLE_ID`, `GOOGLE_SECRET`.

On first OAuth sign-in: create a typdr profile linked to the OAuth identity. On subsequent sign-ins: use the same `userId` so stats accumulate correctly.

---

## 6. Themes

Monkeytype is famous for its theme variety. typdr should have at least 8 curated themes at launch, with a live preview toggle.

### Theme system design

Each theme is a set of CSS custom property overrides. Store them in `lib/data/themes.ts`:

```ts
interface Theme {
  id: string;
  name: string;
  vars: {
    "--surface":        string;
    "--surface-border": string;
    "--brand":          string;
    "--correct":        string;
    "--incorrect":      string;
    "--pending":        string;
    "--cursor":         string;
  };
}
```

Apply with `document.documentElement.style.setProperty(key, value)`.

### Suggested themes

| Name | Vibe | Brand color |
|---|---|---|
| `default` | Current dark + lime | `#e8f55c` |
| `moonlit` | Dark blue-grey + ice blue | `#93c5fd` |
| `ember` | Very dark + orange-red | `#fb923c` |
| `matcha` | Dark green + soft green | `#86efac` |
| `sakura` | Near-black + pink | `#f9a8d4` |
| `paper` | Off-white + black | `#1a1a1a` |
| `midnight` | Pure black + purple | `#a78bfa` |
| `retro` | Dark + amber/crt green | `#d97706` |

Theme preference persisted to localStorage. No server round-trip needed.

---

## 7. PWA (Progressive Web App)

Making typdr installable puts it on the user's home screen / taskbar and gives it an offline mode — crucial for the "practice anywhere" use case.

### What's needed

**`public/manifest.json`**
```json
{
  "name": "typdr",
  "short_name": "typdr",
  "description": "type faster. learn smarter.",
  "start_url": "/practice",
  "display": "standalone",
  "background_color": "#0e0e10",
  "theme_color": "#e8f55c",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service worker** for offline support. Next.js supports this via `next-pwa` or a manual `public/sw.js`. Cache:
- All static assets
- The last 5 word lists / quotes used
- The learn lessons

**What doesn't work offline:** leaderboard, AI drills, streak sync. Degrade gracefully — show local data and a "you're offline" banner.

---

## 8. Custom word packs

Let users create and import domain-specific word lists. High-value domains:

- **Programming** — `useState`, `forEach`, `async`, `await`, `typeof`, `interface`
- **Medical** — `hypertension`, `myocardial`, `stethoscope`, `diagnosis`
- **Legal** — `indemnification`, `jurisdiction`, `plaintiff`, `arbitration`
- **Finance** — `amortization`, `derivative`, `liquidity`, `portfolio`

### Implementation

- "Custom pack" section in practice settings
- User can paste a comma or newline-separated word list
- Words are stored in the user's localStorage / profile
- Option to share a pack via URL: `/practice?pack=base64encodedlist`

Community packs stored in `lib/data/packs/` — add by PR.

---

## Priority order

| Priority | Feature | Effort |
|---|---|---|
| 🔴 High | **Learn tab overhaul** (all of section 4) | 2 weeks |
| 🔴 High | Themes (8 presets) | 1 day |
| 🟠 Medium | Multiplayer race (Ably option) | 1 week |
| 🟠 Medium | GitHub / Google OAuth | 1 day |
| 🟡 Lower | Language packs (Hindi + Spanish first) | 2 days each |
| 🟡 Lower | Keyboard layout switcher | 2 days |
| 🟡 Lower | Custom word packs | 1 day |
| 🟢 Nice | PWA | 1 day |
