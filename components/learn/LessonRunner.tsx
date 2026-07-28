"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Lesson, LessonExercise } from "@/lib/data/curriculum";
import type { SessionResult } from "@/lib/stores/analytics";
import { useAnalyticsStore } from "@/lib/stores/analytics";
import { ExerciseCopy } from "./ExerciseCopy";
import { ExerciseGuidedKey } from "./ExerciseGuidedKey";
import { ExerciseWordReveal } from "./ExerciseWordReveal";
import { ExerciseMetronome } from "./ExerciseMetronome";
import { ExerciseBlind } from "./ExerciseBlind";
import { LessonResult } from "./LessonResult";

interface LessonRunnerProps {
  lesson: Lesson;
}

function personalizeExercises(lesson: Lesson, weakKeys: string[]): LessonExercise[] {
  if (lesson.id !== "s-06" || weakKeys.length === 0) return lesson.exercises;

  const keys = weakKeys.slice(0, 3);
  return lesson.exercises.map((ex, i) => {
    if (i === 0 && ex.type === "guided-key") {
      return { ...ex, content: keys };
    }
    if (ex.type === "copy" || ex.type === "metronome") {
      const padded = keys.map((k) => k.repeat(4)).join(" ");
      const words = keys.map((k) => `${k}${k}${k}`).join(" ");
      return {
        ...ex,
        content: `${padded} ${words} ${keys.join("")} ${keys.join(" ")}`,
        instructions: `Focusing on your weak keys: ${keys.join(", ")}`,
      };
    }
    return ex;
  });
}

export function LessonRunner({ lesson }: LessonRunnerProps) {
  const updateLesson = useAnalyticsStore((s) => s.updateLesson);
  const lessonProgress = useAnalyticsStore((s) => s.lessonProgress);
  const getWeakestKeys = useAnalyticsStore((s) => s.getWeakestKeys);

  const weakKeys = useMemo(
    () => getWeakestKeys(3).map((k) => k.key),
    [getWeakestKeys]
  );

  const exercises = useMemo(
    () => personalizeExercises(lesson, weakKeys),
    [lesson, weakKeys]
  );

  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [aggregated, setAggregated] = useState<SessionResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [passed, setPassed] = useState(false);

  const current = exercises[exerciseIdx];

  function mergeResults(prev: SessionResult | null, next: SessionResult): SessionResult {
    if (!prev) return next;
    const keyStats = { ...prev.keyStats };
    for (const [k, stat] of Object.entries(next.keyStats)) {
      if (!keyStats[k]) keyStats[k] = { hits: 0, misses: 0, avgMs: 0 };
      const combinedHits = keyStats[k].hits + stat.hits;
      const combinedMisses = keyStats[k].misses + stat.misses;
      const totalSamples =
        (keyStats[k].avgMs > 0 ? keyStats[k].hits + keyStats[k].misses : 0) +
        (stat.avgMs > 0 ? stat.hits + stat.misses : 0);
      const avgMs =
        totalSamples > 0
          ? Math.round(
              ((keyStats[k].avgMs * (keyStats[k].hits + keyStats[k].misses || 1)) +
                (stat.avgMs * (stat.hits + stat.misses || 1))) /
                Math.max(totalSamples, 1)
            )
          : 0;
      keyStats[k] = { hits: combinedHits, misses: combinedMisses, avgMs };
    }

    const totalCorrect = prev.correctChars + next.correctChars;
    const totalChars = prev.totalChars + next.totalChars;
    const totalDuration = prev.duration + next.duration;
    const wpm =
      totalDuration > 0
        ? Math.min(Math.round(totalCorrect / 5 / (totalDuration / 60)), 999)
        : next.wpm;
    const accuracy =
      totalChars > 0 ? Math.round((totalCorrect / totalChars) * 100) : next.accuracy;

    return {
      ...next,
      wpm,
      accuracy,
      correctChars: totalCorrect,
      incorrectChars: prev.incorrectChars + next.incorrectChars,
      totalChars,
      duration: totalDuration,
      keyStats,
      keystrokeLog: [...prev.keystrokeLog, ...next.keystrokeLog],
      score: Math.round(wpm * (accuracy / 100) * 10) / 10,
    };
  }

  function handleExerciseComplete(result: SessionResult) {
    const merged = mergeResults(aggregated, result);
    setAggregated(merged);

    if (exerciseIdx < exercises.length - 1) {
      setTimeout(() => {
        setExerciseIdx((i) => i + 1);
        setResetKey((k) => k + 1);
      }, 400);
      return;
    }

    // Lesson complete
    const didPass =
      merged.wpm >= lesson.targetWpm && merged.accuracy >= lesson.targetAccuracy;
    setPassed(didPass);

    const existing = lessonProgress[lesson.id];
    updateLesson({
      lessonId: lesson.id,
      completedAt: Date.now(),
      bestWpm: Math.max(merged.wpm, existing?.bestWpm ?? 0),
      bestAccuracy: Math.max(merged.accuracy, existing?.bestAccuracy ?? 0),
      attempts: (existing?.attempts ?? 0) + 1,
    });

    setShowResult(true);
  }

  function handleRetry() {
    setExerciseIdx(0);
    setResetKey((k) => k + 1);
    setAggregated(null);
    setShowResult(false);
    setPassed(false);
  }

  if (showResult && aggregated) {
    return (
      <LessonResult
        lesson={lesson}
        result={aggregated}
        passed={passed}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div>
      {/* Exercise progress */}
      <div className="flex items-center gap-2 mb-2">
        {exercises.map((ex, i) => (
          <div
            key={i}
            className={`h-1 rounded-full flex-1 transition-all ${
              i < exerciseIdx
                ? "bg-brand"
                : i === exerciseIdx
                ? "bg-brand/50"
                : "bg-surface-border"
            }`}
            title={ex.type}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-mono text-slate-500">
          Exercise {exerciseIdx + 1} / {exercises.length}
          <span className="ml-2 text-slate-600">· {current.type}</span>
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${exerciseIdx}-${resetKey}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="bg-surface-secondary border border-surface-border rounded-xl p-6 sm:p-8"
        >
          {current.type === "copy" && (
            <ExerciseCopy
              exercise={current}
              onComplete={handleExerciseComplete}
              resetKey={resetKey}
            />
          )}
          {current.type === "guided-key" && (
            <ExerciseGuidedKey
              exercise={current}
              onComplete={handleExerciseComplete}
            />
          )}
          {current.type === "word-reveal" && (
            <ExerciseWordReveal
              exercise={current}
              onComplete={handleExerciseComplete}
            />
          )}
          {current.type === "metronome" && (
            <ExerciseMetronome
              exercise={current}
              onComplete={handleExerciseComplete}
              resetKey={resetKey}
            />
          )}
          {current.type === "blind" && (
            <ExerciseBlind
              exercise={current}
              onComplete={handleExerciseComplete}
              resetKey={resetKey}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
