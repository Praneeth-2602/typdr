import type { KeystrokeEvent, SessionResult } from "@/lib/stores/analytics";
import { generateCoachFeedback } from "@/lib/utils/feedback";

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * WPM = (correct chars / 5) / elapsed minutes
 * We divide by 5 because the industry standard treats every 5 keystrokes
 * as one "word" regardless of actual word length.
 */
export function calcWpm(chars: number, elapsedMs: number): number {
  const minutes = elapsedMs / 60000;
  if (minutes < 0.02) return 0; // avoid absurdly high values on very short tests
  return Math.min(Math.round(chars / 5 / minutes), 999);
}

export function calcAccuracy(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

/**
 * Consistency (0–100): inverse of coefficient of variation across WPM chunks.
 * A perfectly steady typist gets 100; high variance collapses toward 0.
 * Falls back to 100 when there are fewer than 2 chunks (short tests).
 */
export function calcConsistency(wpmChunks: number[]): number {
  const filtered = wpmChunks.filter((v) => v > 0);
  if (filtered.length < 2) return 100;
  const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  if (avg === 0) return 100;
  const variance =
    filtered.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / filtered.length;
  const cv = Math.sqrt(variance) / avg; // coefficient of variation
  return Math.max(0, Math.round((1 - cv) * 100));
}

export function buildSessionResult(params: {
  mode: SessionResult["mode"];
  startTime: number;
  endTime: number;
  typedText: string;
  targetText: string;
  keystrokeLog: KeystrokeEvent[];
  wpmChunks: number[];
}): SessionResult {
  const { mode, startTime, endTime, typedText, targetText, keystrokeLog, wpmChunks } = params;

  const duration = Math.max((endTime - startTime) / 1000, 0.1);
  const correctChars = typedText.split("").filter((c, i) => c === targetText[i]).length;
  const incorrectChars = typedText.length - correctChars;
  const wpm = calcWpm(correctChars, endTime - startTime);
  const rawWpm = calcWpm(typedText.length, endTime - startTime);
  const score = Math.round(wpm * (calcAccuracy(correctChars, typedText.length) / 100) * 10) / 10;

  // ── Per-key stats ─────────────────────────────────────────────────────────
  const keyStats: SessionResult["keyStats"] = {};
  const keyTimestamps: Record<string, number[]> = {};

  for (const timing of keystrokeLog) {
    const k = timing.expectedChar || timing.typedChar;
    if (!k) continue;
    const kl = k.toLowerCase();
    if (!keyStats[kl]) keyStats[kl] = { hits: 0, misses: 0, avgMs: 0 };
    if (!keyTimestamps[kl]) keyTimestamps[kl] = [];
    if (timing.correct) keyStats[kl].hits++;
    else keyStats[kl].misses++;
    if (typeof timing.latencyMs === "number" && timing.latencyMs > 0 && timing.latencyMs < 2000) {
      keyTimestamps[kl].push(timing.latencyMs);
    }
  }

  // Avg inter-key interval per key (reaction time proxy)
  for (const [k, timestamps] of Object.entries(keyTimestamps)) {
    if (timestamps.length === 0) continue;
    keyStats[k].avgMs = Math.round(timestamps.reduce((a, b) => a + b, 0) / timestamps.length);
  }

  // ── Bigram timings ────────────────────────────────────────────────────────
  const bigramTimings: SessionResult["bigramTimings"] = {};
  for (let i = 1; i < keystrokeLog.length; i++) {
    const a = (keystrokeLog[i - 1].typedChar || keystrokeLog[i - 1].expectedChar).toLowerCase();
    const b = (keystrokeLog[i].typedChar || keystrokeLog[i].expectedChar).toLowerCase();
    // Only track alpha-to-alpha bigrams — punctuation timings are noisy
    if (!/[a-z]/.test(a) || !/[a-z]/.test(b)) continue;
    const dt = keystrokeLog[i].timestamp - keystrokeLog[i - 1].timestamp;
    if (dt <= 0 || dt >= 2000) continue; // ignore pauses and impossible values
    const bg = a + b;
    if (!bigramTimings[bg]) bigramTimings[bg] = [];
    bigramTimings[bg].push(dt);
  }

  const weakKeys = Object.entries(keyStats)
    .filter(([key, stat]) => key.length === 1 && /[a-z,./;']/.test(key) && stat.hits + stat.misses >= 2)
    .map(([key, stat]) => {
      const attempts = stat.hits + stat.misses;
      const accuracy = Math.round((stat.hits / Math.max(attempts, 1)) * 100);
      const avgLatency = stat.avgMs;
      const weaknessScore = Math.round((((1 - accuracy / 100) * 0.7) + ((Math.min(avgLatency, 500) / 500) * 0.3)) * 1000) / 1000;
      return { key, attempts, accuracy, avgLatency, weaknessScore };
    })
    .sort((a, b) => {
      if (b.weaknessScore !== a.weaknessScore) return b.weaknessScore - a.weaknessScore;
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.avgLatency - a.avgLatency;
    })
    .slice(0, 5);

  const feedback = generateCoachFeedback({
    wpm,
    rawWpm,
    accuracy: calcAccuracy(correctChars, typedText.length),
    consistency: calcConsistency(wpmChunks),
    errorCount: incorrectChars,
    weakKeys,
  });

  const accuracy = calcAccuracy(correctChars, typedText.length);
  const consistency = calcConsistency(wpmChunks);

  return {
    id: generateSessionId(),
    timestamp: startTime,
    mode,
    duration,
    wpm,
    rawWpm,
    accuracy,
    consistency,
    totalChars: typedText.length,
    correctChars,
    incorrectChars,
    keyStats,
    bigramTimings,
    keystrokeLog,
    feedback,
    score,
  };
}
