import type { SessionResult, WeakKeyStat } from "@/lib/stores/analytics";

export function generateCoachFeedback(params: {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errorCount: number;
  weakKeys: WeakKeyStat[];
}): string[] {
  const { wpm, rawWpm, accuracy, consistency, errorCount, weakKeys } = params;
  const lines: string[] = [];
  const weakKeyList = weakKeys.slice(0, 3).map((item) => item.key);
  const accuracyCost = rawWpm - wpm;

  if (accuracy < 90) {
    lines.push("Accuracy is the first unlock right now. Slow down slightly and aim for cleaner runs before pushing speed.");
  } else if (accuracy >= 97) {
    lines.push("Control looks strong. You have room to press speed without your accuracy collapsing.");
  }

  if (consistency < 75) {
    lines.push("Your pace swings across the run. Try to hold a calmer rhythm instead of sprinting the easy sections.");
  } else if (consistency >= 88 && wpm >= 40) {
    lines.push("Your rhythm stayed steady through most of the test. Keep that cadence and nudge speed up gradually.");
  }

  if (accuracyCost >= 8 || errorCount >= 6) {
    lines.push(`Errors are costing real speed right now. Cleaning them up would recover about ${accuracyCost} WPM from this run.`);
  }

  if (weakKeyList.length > 0) {
    const weakKeyText = weakKeyList.map((key) => `'${key}'`).join(", ");
    lines.push(`Your weakest keys right now are ${weakKeyText}. Repeating drills around those keys should pay off fastest.`);
  }

  if (lines.length === 0) {
    lines.push("Solid run overall. Keep stacking clean sessions and look for small gains in speed while protecting accuracy.");
  }

  return lines.slice(0, 3);
}

export function getSessionWeakKeys(result: SessionResult, limit = 5): WeakKeyStat[] {
  const rows = Object.entries(result.keyStats)
    .filter(([key, stat]) => key.length === 1 && /[a-z,./;']/.test(key) && stat.hits + stat.misses >= 2)
    .map(([key, stat]) => {
      const attempts = stat.hits + stat.misses;
      const accuracy = Math.round((stat.hits / Math.max(attempts, 1)) * 100);
      const avgLatency = stat.avgMs;
      const weaknessScore = Math.round((((1 - accuracy / 100) * 0.7) + ((Math.min(avgLatency, 500) / 500) * 0.3)) * 1000) / 1000;

      return {
        key,
        attempts,
        accuracy,
        avgLatency,
        weaknessScore,
      };
    })
    .sort((a, b) => {
      if (b.weaknessScore !== a.weaknessScore) return b.weaknessScore - a.weaknessScore;
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.avgLatency - a.avgLatency;
    });

  return rows.slice(0, limit);
}
