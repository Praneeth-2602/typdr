# SwiftKeys v3 — Changelog & Developer Notes

> Previous history: see `CHANGELOG_v2.md`.
> This document covers every change introduced in v3 — new features, architectural decisions, and the reasoning behind each one.

---

## New Features

### 1. Typing sound feedback
**Files:** `hooks/useSound.ts` (new), `components/typing/TypingBox.tsx`

Three procedurally generated sounds using the Web Audio API — zero audio files, zero dependencies.

| Sound | Trigger | Description |
|-------|---------|-------------|
| `keyClick` | Correct keystroke | Short noise burst with exponential decay — mimics a mechanical switch |
| `keyError` | Incorrect keystroke | Descending sine tone — a "dull thud" that's unpleasant enough to reinforce accuracy |
| `testDone` | Test completion | Three-note ascending chime (C5 → E5 → G5) |

The `AudioContext` is created lazily on first user interaction to satisfy browser autoplay policies. A `Volume2 / VolumeX` toggle button in the live stats bar lets users turn sound on/off. The preference is persisted to `localStorage` under `swiftkeys-sound`.

**`useSound(enabled: boolean)`** — returns a stable `play(type)` function. Creates a new `AudioContext` on first call; subsequent calls reuse it.

**`useSoundPreference()`** — reads/writes `localStorage` and returns `{ enabled, toggle }`. Used in `TypingBox` to wire the button.

---

### 2. Timed mode progress bar
**File:** `components/typing/TypingBox.tsx`

A 2px horizontal bar sits between the live stats and the text area. It fills left-to-right as time elapses (0% → 100%). Implemented with a Framer Motion `motion.div` width transition at 250ms. Only renders when `duration > 0`.

```tsx
const progressPct = duration > 0 && started
  ? Math.min(100, ((duration - (timeLeft ?? 0)) / duration) * 100)
  : 0;
```

The bar gives instant peripheral feedback so users don't need to stare at the countdown number.

---

### 3. Daily challenge mode
**Files:** `lib/data/corpus.ts`, `app/practice/page.tsx`

`getDailyChallenge()` uses a seeded linear congruential generator (LCG) keyed to today's date:

```ts
const seed = year * 10000 + (month + 1) * 100 + day;
```

This produces the same text for all users on the same calendar date without any server state. The pool is all quotes + pangrams. A banner in the practice UI shows the full date label ("Daily challenge — Monday, 2 June").

The daily text changes at midnight local time (the seed is computed client-side).

---

### 4. Pangram warm-up mode
**Files:** `lib/data/corpus.ts`, `app/practice/page.tsx`

A `PANGRAMS` array of 8 classic pangrams (sentences containing every letter of the alphabet). Accessible via the new `pangram` mode in the practice page. Useful as a 10-second warm-up before a timed test. Each click of "new pangram" picks a different one at random.

---

### 5. Multi-line performance chart
**File:** `app/analytics/page.tsx`

The WPM-only line chart is replaced with a three-line chart:

| Line | Colour | Stroke |
|------|--------|--------|
| WPM | `#e8f55c` (brand lime) | 2px solid |
| Accuracy | `#4ade80` (correct green) | 1.5px dashed `4 2` |
| Consistency | `#818cf8` (indigo) | 1.5px dashed `2 3` |

Different dash patterns avoid relying on colour alone for accessibility. The Recharts `Legend` component is added. The tooltip is updated to show all three values simultaneously.

---

### 6. Per-mode breakdown table
**File:** `app/analytics/page.tsx`

A compact table below the chart shows aggregate stats for each mode the user has practised:

| Column | Description |
|--------|-------------|
| mode | words / time / quote / code / custom / daily / pangram |
| sessions | count of completed sessions in that mode |
| avg wpm | mean WPM across all sessions for that mode |
| avg accuracy | mean accuracy % |

Modes with zero sessions are excluded. This helps users identify which mode they're strongest/weakest in and decide where to focus.

---

### 7. CSV export
**Files:** `app/api/export/route.ts` (new), `app/analytics/page.tsx`

A serverless Edge API route at `POST /api/export` accepts the sessions array as JSON and returns a `text/csv` response with a `Content-Disposition: attachment` header triggering a browser download.

**CSV columns:** `date, time, mode, wpm, raw_wpm, accuracy, consistency, duration_s, correct_chars, incorrect_chars, total_chars`

The client side:
```ts
const res  = await fetch("/api/export", { method: "POST", body: JSON.stringify(sessions) });
const blob = await res.blob();
const url  = URL.createObjectURL(blob);
// synthetic click triggers download
```

All CSV escaping (quoted fields, escaped double quotes) is handled server-side via `escapeCsv()`.

---

### 8. Heatmap view toggle (accuracy / volume / finger)
**File:** `app/analytics/page.tsx`

A three-button toggle above the keyboard heatmap switches between views:

| View | What it shows |
|------|--------------|
| **accuracy** | Keys coloured green → amber → red by error rate (default, same as v2) |
| **volume** | Passes `showFingerColors={false}` with a note — future: opacity scaled by keystroke count |
| **finger** | Passes `showFingerColors={true}` to `KeyboardHeatmap` — each key coloured by which finger types it, per the standard touch-typing assignment |

The toggle state is kept in React component state (not persisted — it resets on navigation, which is fine for an analytical view).

---

### 9. Expanded corpus
**File:** `lib/data/corpus.ts`

| Item | v2 count | v3 count |
|------|----------|----------|
| `COMMON_WORDS` | ~200 | ~400 |
| `QUOTES` | 10 | 25 |
| `CODE_SNIPPETS` | 5 | 12 |
| `PANGRAMS` | 0 | 8 (new) |

New code snippet languages: **Go** (worker pool), **Rust** (iterator chain), **SQL** (window function), **Bash** (deploy script).

`generateWordTest()` punctuation is now randomised (Bernoulli trials per word: 6% comma, 3% period, 1% `!`, 1% `?`) instead of fixed modular intervals (every 7th / 15th word in v2). This prevents muscle memory from predicting punctuation positions.

---

### 10. `Suspense` boundary for `useSearchParams`
**File:** `app/practice/page.tsx`

Next.js 14 App Router requires any component calling `useSearchParams()` to be wrapped in a `<Suspense>` boundary, otherwise the build fails with:

```
Error: useSearchParams() should be wrapped in a suspense boundary
```

The practice page is split into two components:
- `PracticeInner` — contains all state and JSX, calls `useSearchParams()`
- `PracticePage` (default export) — wraps `PracticeInner` in `<Suspense>` with a minimal loading fallback

This is a breaking change if deploying to Vercel — the v2 build would fail in production even if it worked in `next dev`.

---

## Files Changed

| File | Type | Summary |
|------|------|---------|
| `hooks/useSound.ts` | **New** | Web Audio procedural sounds: click, error, chime |
| `app/api/export/route.ts` | **New** | Edge CSV export route |
| `lib/data/corpus.ts` | Full rewrite | Expanded corpus, randomised punctuation, pangrams, daily challenge |
| `components/typing/TypingBox.tsx` | Significant edit | Sound integration, progress bar, sound toggle button |
| `app/practice/page.tsx` | Full rewrite | Suspense boundary, daily + pangram modes |
| `app/analytics/page.tsx` | Significant edit | Multi-line chart, mode breakdown, CSV export, heatmap toggle |
| `package.json` | Edit | Version bumped to 3.0.0 |
| `docs/CHANGELOG_v3.md` | **New** | This document |

---

## Architectural Notes

### Why Web Audio API instead of a sound library
Libraries like `use-sound` or Howler add 20–50 KB to the bundle and require audio file assets. Web Audio API generates all sounds procedurally in <20 lines each. The `AudioContext` is created lazily (not at module load) so there's zero cost for users who never trigger a sound, and no autoplay policy violations.

### Why LCG for daily challenge instead of a hash
A cryptographic hash (SHA-256) would produce better distribution but requires the `crypto` module and is harder to read. A linear congruential generator seeded from an integer is trivially reproducible in any language and produces visually random output for day-to-day seeds. The stakes (picking a typing text) don't require cryptographic quality randomness.

### Why Edge runtime for the export route
The CSV generation is pure string manipulation with no Node.js-specific APIs (`fs`, `Buffer`, etc.). Running on the Edge runtime gives faster cold starts and global distribution via Vercel's edge network. The `POST` body is the full sessions array (max ~1000 sessions × ~200 bytes/session = ~200 KB), well within Edge's 4 MB request body limit.

### Why `useSearchParams` needed `Suspense`
In Next.js 14 App Router, `useSearchParams()` opts the component into dynamic rendering (it reads from the URL at request time). Without a `Suspense` boundary, Next.js cannot statically render the shell of the page and will throw a build-time error. The `Suspense` wrapper tells Next.js that this subtree can stream in after the initial shell.
