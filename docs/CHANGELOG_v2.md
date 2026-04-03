# SwiftKeys v2 — Changelog & Developer Notes

> This document covers every bug fix, behaviour change, and new feature introduced in v2.
> Each entry references the file(s) changed and explains *why* the fix was needed.

---

## Bug Fixes

### 1. `Ctrl+Backspace` deleted the entire input
**File:** `components/typing/TypingBox.tsx`

**Root cause:** The browser's native `Ctrl+Backspace` behaviour on an `<input type="text">` deletes
the whole value when the input's `value` is controlled by React. Because we were not calling
`e.preventDefault()` and not handling the key ourselves, the browser wiped the entire
controlled string.

**Fix:** In `handleKeyDown`, we intercept `(e.ctrlKey || e.metaKey) && e.key === "Backspace"`,
call `e.preventDefault()` to stop the browser, then run `deleteLastWord()` on the current
`typedRef.current` value. `deleteLastWord()` trims trailing spaces first, then slices back to
the previous space — matching the behaviour of VS Code / terminal word-deletion.

```ts
function deleteLastWord(str: string): string {
  if (!str) return str;
  const trimmed = str.trimEnd();
  if (trimmed.length < str.length) return trimmed; // only trailing spaces — remove them
  const lastSpace = trimmed.lastIndexOf(" ");
  return lastSpace === -1 ? "" : trimmed.slice(0, lastSpace + 1);
}
```

---

### 2. Stale-closure WPM drift in the timer
**File:** `components/typing/TypingBox.tsx`

**Root cause:** The `setInterval` callback in v1 closed over `typed` (React state). Because React
batches state updates, the interval callback always read the `typed` value from the render in
which it was created — typically the render when `started` first became `true`. The longer a
session ran, the more out-of-date the WPM calculation became.

**Fix:** A `typedRef` (a `useRef`) is kept in sync with every `setTyped()` call. The interval
reads `typedRef.current` instead of the stale `typed` closure, guaranteeing it always sees the
latest value without triggering re-renders.

---

### 3. `chunkCharsRef.current += 0` — WPM chunks never accumulated
**File:** `components/typing/TypingBox.tsx`

**Root cause:** The chunk accumulation line was literally `chunkCharsRef.current += 0;` — a
no-op left from a refactor. As a result, `wpmChunks` always contained zeroes, making the
`consistency` score meaningless (always ~0 or division-by-zero).

**Fix:** Removed the dead line. The interval now pushes the live WPM snapshot into
`wpmChunksRef.current` every 5 seconds, producing a valid sequence for `calcConsistency()`.

---

### 4. Double `finish()` fire — sessions saved twice
**File:** `components/typing/TypingBox.tsx`

**Root cause:** `finish()` checked `if (finished) return` where `finished` is React state.
Because `finish()` was called from both a `useEffect` (completion check) and the timer callback,
and because state updates are asynchronous, both could read `finished === false` in the same
render cycle and both would proceed — saving the session to the store twice.

**Fix:** Replaced the state guard with a `finishedRef` (a `useRef<boolean>`). A ref update is
synchronous, so the first caller sets `finishedRef.current = true` immediately and any
subsequent caller bails out before doing any work.

---

### 5. Hidden input lost focus silently
**File:** `components/typing/TypingBox.tsx`

**Root cause:** The invisible `<input>` could be blurred by clicking outside it (e.g. scrolling
the page, clicking a toolbar item, switching tabs). There was no recovery path — the user
would be typing but nothing would register.

**Fix:** Three complementary layers:
1. `onBlur` handler calls `setTimeout(() => inputRef.current?.focus(), 80)` — re-grabs focus
   after any blur, unless the test is finished.
2. A `document.addEventListener("keydown", ...)` listener fires on every keydown. If the
   active element is not the hidden input and the key is printable, it calls `inputRef.current?.focus()`.
3. The whole typing area `<div>` has an `onClick` that also calls `.focus()`.

---

### 6. Extra characters caused layout explosion
**File:** `components/typing/TypingBox.tsx`

**Root cause:** No cap on how many characters beyond `text.length` could be typed. A user who
held down a key could type hundreds of extra characters, stretching the flex-wrap container
off-screen.

**Fix:** Added `MAX_EXTRA_CHARS = 20`. The `handleChange` function returns early if
`val.length > text.length + MAX_EXTRA_CHARS`. The render clips accordingly.

---

### 7. `keyTimings` recorded `Backspace` and `Control` as typed characters
**File:** `components/typing/TypingBox.tsx`

**Root cause:** `handleChange` fired on every value change — including deletions. When
`val.length > typedRef.current.length` was evaluated after a backspace, the condition
was sometimes true due to IME composition events or synthetic events in certain browsers,
causing garbage keys like `"Backspace"` to appear in per-key analytics.

**Fix:** The key recording block now only fires when `val.length > typedRef.current.length`
(character added, not removed), and reads `val[val.length - 1]` directly — guaranteeing it is
always a single printable character.

---

### 8. `calcConsistency` divided by zero / returned nonsense on short tests
**File:** `lib/utils/engine.ts`

**Root cause:** If `avg === 0` (all chunks were 0 WPM), the consistency formula produced `NaN`.
If only one chunk existed, `wpmChunks.length < 2` returned 100 — correct, but the zero-filter
was missing.

**Fix:**
```ts
const filtered = wpmChunks.filter((v) => v > 0);
if (filtered.length < 2) return 100;
const avg = filtered.reduce(...) / filtered.length;
if (avg === 0) return 100;
const cv = Math.sqrt(variance) / avg; // coefficient of variation
return Math.max(0, Math.round((1 - cv) * 100));
```
Using coefficient of variation (stdDev / mean) instead of raw stdDev makes the score
scale-independent — a typist doing 30 WPM and a typist doing 120 WPM are judged on
proportional variance, not absolute WPM swings.

---

### 9. `getWeakestKeys` included low-volume keys and space
**File:** `lib/stores/analytics.ts`

**Root cause:** Any key with even 1 hit/miss was included. Keys with 1 sample have 100% or 0%
accuracy by definition — neither is meaningful. Space was also shown, which is unhelpful.

**Fix:** Added filter: `key.length === 1 && /[a-z,./;']/.test(key) && stat.hits + stat.misses >= 3`.

---

### 10. `getSlowestBigrams` had no minimum sample filter
**File:** `lib/stores/analytics.ts`

**Root cause:** A bigram seen once could be the "slowest" — pure noise.

**Fix:** Added `timings.length >= 3` filter before computing averages.

---

### 11. `updateLesson` could overwrite a better score with a worse one
**File:** `lib/stores/analytics.ts`

**Root cause:** The `updateLesson` action did a shallow spread of the new progress object,
meaning a second attempt with lower WPM would overwrite a previous personal best.

**Fix:** Explicitly takes `Math.max(progress.bestWpm, existing?.bestWpm ?? 0)` and same for
`bestAccuracy`, so scores are monotonically non-decreasing.

---

### 12. WPM chart Y-axis started at 0 making small improvements invisible
**File:** `app/analytics/page.tsx`

**Root cause:** No `domain` prop on the Recharts `<YAxis>`, which defaults to `[0, "auto"]`.
For a user averaging 60–70 WPM, the chart showed a nearly flat line in the top 15% of the axis.

**Fix:** Added `domain={["auto", "auto"]}` to let Recharts fit the axis to the actual data range.

---

### 13. `Tab` key stole focus from the hidden input
**File:** `components/typing/TypingBox.tsx`

**Root cause:** No `Tab` key handling. Pressing Tab during a test would focus the next
focusable element (restart button, nav link, etc.), silently stopping the test.

**Fix:** `handleKeyDown` now intercepts `e.key === "Tab"` and calls `e.preventDefault()`.

---

### 14. Timer interval was 500ms — countdown felt sluggish
**File:** `components/typing/TypingBox.tsx`

**Root cause:** 500ms tick meant the displayed countdown could be 1 second behind real time and
WPM updates felt laggy.

**Fix:** Reduced to 250ms. CPU impact is negligible; `setInterval` at 250ms is well within
browser budget for a simple arithmetic update.

---

## New Features

### Ctrl+Backspace — delete last word
When the user presses `Ctrl+Backspace` (or `Cmd+Backspace` on Mac), the last typed word is
removed. This matches the behaviour of most text editors and terminals. See fix #1 above.

### Escape — instant restart
Pressing `Escape` at any time during a test calls `handleRestart()`. The input is cleared,
the timer stops, and focus returns to the input. This is faster than reaching for the mouse.

### Caps Lock warning
If `CapsLock` is active, a yellow banner appears above the test:
> ⇪ Caps Lock is on — this will cause errors

Detection uses `e.getModifierState("CapsLock")` on every `keydown`. The banner disappears as
soon as the user turns Caps Lock off.

### Keyboard shortcuts hint bar
A persistent hint bar below the text shows:
- `Esc` restart
- `Ctrl + ⌫` delete word

### Personal best detection
`ResultCard` now calls `getTopWpm()` from the store and compares it to the current result.
If `result.wpm >= topWpm`, a "🏆 New personal best!" badge is shown.

### WPM trend badge in ResultCard
Calls `getAccuracyTrend()` (last 10 sessions vs previous 10) and shows a green TrendingUp
or red TrendingDown badge if the delta is ≥ 3 WPM. Helps users see if they're on an upward
or downward trajectory.

### Accuracy-cost breakdown
If `rawWpm - wpm > 8`, a warning is shown:
> "Errors cost you 12 WPM — your raw speed was 82 but accuracy dropped it to 70. Focus on accuracy first."

This teaches the key insight: raw speed is meaningless without accuracy.

### Day streak counter
`getStreakDays()` in the analytics store counts consecutive calendar days with at least one
session. Displayed as a flame stat card on the analytics page.

### `?drill=` query parameter on the practice page
The analytics page's "Practice this drill →" link now passes the drill text as a URL query
parameter. The practice page reads `searchParams.get("drill")` on mount and pre-loads it.
This allows seamless navigation from analytics → practice with the generated drill active.

### Session cap raised from 500 → 1000
The `addSession` cap was raised to accommodate power users who do 10+ sessions a day.

### `localStorage` key bumped to `swiftkeys-analytics-v2`
Prevents old v1 data (with potentially corrupted `wpmChunks: [0,0,0,...]`) from polluting
the new store. Old data is effectively abandoned (not migrated) — a clean slate is better
than showing misleading historical stats.

---

## Architecture Notes

### Why `typedRef` instead of `typed` in the timer
React closures inside `setInterval` capture values at creation time. If `typed` is captured at
`t=0` when it's `""`, the interval will always see `""` unless you add `typed` to the
dependency array of the effect — but doing so would restart the interval on every keystroke,
causing the countdown to reset. The `ref` pattern breaks this dependency entirely.

### Why `finishedRef` instead of `finished` for the guard
`useState` updates are batched and applied asynchronously. A `useRef` update is synchronous,
making it suitable for use as an idempotency guard across multiple concurrent callers.

### Why `deleteLastWord` trims trailing spaces first
Most text editors' Ctrl+Backspace behaviour: if the caret is after spaces (e.g. you just
pressed space after a word), the first Ctrl+Backspace removes the trailing space, and the
second one removes the word. This matches user expectation.

---

## Files Changed

| File | Type | Summary |
|------|------|---------|
| `components/typing/TypingBox.tsx` | Full rewrite | All 14 bug fixes, Escape, Ctrl+Backspace, Caps Lock, shortcuts hint, blur recovery |
| `components/typing/ResultCard.tsx` | Significant edit | PB badge, WPM trend, accuracy-cost callout |
| `lib/utils/engine.ts` | Significant edit | calcConsistency fixed, bigram filter, WPM cap |
| `lib/stores/analytics.ts` | Significant edit | updateLesson guard, getWeakestKeys filter, getStreakDays, getAccuracyTrend, session cap |
| `app/practice/page.tsx` | Moderate edit | ?drill= query param, Cancel button for custom mode |
| `app/analytics/page.tsx` | Moderate edit | Streak card, trend, chart domain, drill link passes query param |
| `docs/CHANGELOG_v2.md` | New file | This document |

