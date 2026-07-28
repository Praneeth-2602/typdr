"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Star, ArrowRight, RotateCcw, Target } from "lucide-react";
import type { Lesson } from "@/lib/data/curriculum";
import { getNextLesson, getStarRating } from "@/lib/data/curriculum";
import type { SessionResult } from "@/lib/stores/analytics";
import clsx from "clsx";

interface LessonResultProps {
  lesson: Lesson;
  result: SessionResult;
  passed: boolean;
  onRetry: () => void;
}

export function LessonResult({ lesson, result, passed, onRetry }: LessonResultProps) {
  const stars = getStarRating(result.wpm, lesson.targetWpm, passed);
  const next = getNextLesson(lesson.id);

  // Per-key breakdown for target keys
  const keyBreakdown = lesson.targetKeys
    .map((key) => {
      const kl = key.toLowerCase();
      const stat = result.keyStats[kl] ?? result.keyStats[key];
      if (!stat) return { key, accuracy: null as number | null, volume: 0, avgMs: 0 };
      const total = stat.hits + stat.misses;
      return {
        key,
        accuracy: total > 0 ? Math.round((stat.hits / total) * 100) : null,
        volume: total,
        avgMs: stat.avgMs,
      };
    })
    .filter((k) => k.volume > 0 || lesson.targetKeys.length <= 12);

  const slowest = [...keyBreakdown]
    .filter((k) => k.volume > 0 && k.avgMs > 0)
    .sort((a, b) => b.avgMs - a.avgMs)[0];

  const weakest = [...keyBreakdown]
    .filter((k) => k.accuracy !== null && k.volume > 0)
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "p-6 rounded-xl border",
        passed ? "bg-green-950/20 border-green-900/40" : "bg-amber-950/20 border-amber-900/40"
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div
            className={clsx(
              "font-mono font-bold text-lg mb-1",
              passed ? "text-correct" : "text-amber-400"
            )}
          >
            {passed ? "Lesson passed" : "Not quite — keep going"}
          </div>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                size={18}
                className={clsx(
                  s <= stars ? "text-brand fill-brand" : "text-slate-700"
                )}
              />
            ))}
            {passed && (
              <span className="ml-2 text-xs font-mono text-slate-500">
                {stars === 3 ? "130%+ WPM" : stars === 2 ? "110%+ WPM" : "Passed"}
              </span>
            )}
          </div>
          {!passed && (
            <p className="text-xs text-slate-500 font-mono">
              Need {lesson.targetWpm} wpm & {lesson.targetAccuracy}% accuracy
            </p>
          )}
        </div>

        <div className="flex gap-6 font-mono">
          <div className="text-center">
            <div
              className={clsx(
                "text-2xl font-bold",
                result.wpm >= lesson.targetWpm ? "text-brand" : "text-slate-300"
              )}
            >
              {result.wpm}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">
              wpm <span className="text-slate-600">/ {lesson.targetWpm}</span>
            </div>
          </div>
          <div className="text-center">
            <div
              className={clsx(
                "text-2xl font-bold",
                result.accuracy >= lesson.targetAccuracy ? "text-correct" : "text-slate-300"
              )}
            >
              {result.accuracy}%
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">
              acc <span className="text-slate-600">/ {lesson.targetAccuracy}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-key breakdown */}
      {keyBreakdown.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wide mb-3">
            Target key accuracy
          </div>
          <div className="flex flex-wrap gap-2">
            {keyBreakdown.slice(0, 16).map(({ key, accuracy, volume }) => (
              <div
                key={key}
                className="px-2.5 py-1.5 rounded-lg border border-surface-border bg-surface-secondary font-mono text-xs"
                title={volume > 0 ? `${volume} presses` : "Not typed"}
              >
                <span className="text-slate-300 mr-2">{key === " " ? "␣" : key}</span>
                <span
                  className={clsx(
                    "font-bold",
                    accuracy === null
                      ? "text-slate-600"
                      : accuracy >= 95
                      ? "text-correct"
                      : accuracy >= 85
                      ? "text-brand"
                      : "text-incorrect"
                  )}
                >
                  {accuracy === null ? "—" : `${accuracy}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slowest / weakest tip */}
      {(slowest || weakest) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {weakest && weakest.accuracy !== null && weakest.accuracy < 95 && (
            <Link
              href={`/practice?drill=${encodeURIComponent(weakest.key.repeat(8) + " ")}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border bg-surface-secondary text-xs font-mono text-slate-300 hover:border-brand/40 hover:text-brand transition-colors"
            >
              <Target size={12} />
              Drill weak key: {weakest.key}
            </Link>
          )}
          {slowest && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border/50 text-xs font-mono text-slate-500">
              Slowest: {slowest.key} ({slowest.avgMs}ms)
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 border border-surface-border text-slate-300 font-mono text-xs rounded-lg hover:bg-surface-hover"
        >
          <RotateCcw size={12} />
          Retry lesson
        </button>
        {passed && next && (
          <Link
            href={`/learn/${next.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-surface font-mono font-bold text-xs rounded-lg hover:bg-brand-dim"
          >
            Next: {next.title}
            <ArrowRight size={12} />
          </Link>
        )}
        {passed && !next && (
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-surface font-mono font-bold text-xs rounded-lg hover:bg-brand-dim"
          >
            Back to map
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
