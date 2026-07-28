"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { PageLoader } from "@/components/PageLoader";
import { KeyboardHeatmap } from "@/components/keyboard/KeyboardHeatmap";
import { HandDiagram } from "@/components/learn/HandDiagram";
import { LessonRunner } from "@/components/learn/LessonRunner";
import {
  getLesson,
  isLessonUnlocked,
  PHASE_META,
} from "@/lib/data/curriculum";
import { useAnalyticsStore } from "@/lib/stores/analytics";

export default function LessonPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const { status } = useSession();
  const lessonProgress = useAnalyticsStore((s) => s.lessonProgress);

  const lesson = getLesson(id);

  if (status === "loading") {
    return <PageLoader />;
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-slate-400 mb-4">Lesson not found</p>
          <Link href="/learn" className="text-brand font-mono text-sm hover:underline">
            ← Back to learn
          </Link>
        </div>
      </div>
    );
  }

  const unlocked = isLessonUnlocked(lesson, lessonProgress);

  return (
    <div className="min-h-screen bg-surface">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-border/50">
        <Link href="/" className="font-mono font-bold text-base tracking-tight">
          <span className="text-brand">typ</span>
          <span className="text-sky-400">dr</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link href="/practice" className="hover:text-slate-200">
            Practice
          </Link>
          <Link href="/learn" className="text-brand">
            Learn
          </Link>
          <Link href="/analytics" className="hover:text-slate-200">
            Analytics
          </Link>
          <Link href="/leaderboard" className="hover:text-slate-200">
            Leaderboard
          </Link>
          <ThemeSwitcher />
          <AuthButtons />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push("/learn")}
              className="p-2 rounded-lg border border-surface-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover"
              aria-label="Back to learn map"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs text-slate-500 mb-0.5">
                Phase {lesson.phase} — {PHASE_META[lesson.phase].title}
                <span className="mx-2 text-slate-700">·</span>
                {lesson.id}
              </div>
              <h1 className="font-mono font-bold text-slate-100 text-xl truncate">
                {lesson.title}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">{lesson.description}</p>
            </div>
            <div className="ml-auto text-right text-xs font-mono text-slate-500 hidden sm:block">
              <div>
                Target:{" "}
                <span className="text-brand">{lesson.targetWpm} wpm</span>
              </div>
              <div>{lesson.targetAccuracy}% accuracy</div>
              <div className="text-slate-600 mt-0.5">~{lesson.estimatedMinutes} min</div>
            </div>
          </div>

          {!unlocked ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-surface-border bg-surface-secondary">
              <Lock size={28} className="text-slate-600 mb-4" />
              <p className="font-mono text-slate-400 text-sm mb-1">Lesson locked</p>
              <p className="text-xs text-slate-600 font-mono mb-6">
                Pass {lesson.unlocksAfter} to unlock
              </p>
              <Link
                href="/learn"
                className="px-4 py-2 bg-brand text-surface font-mono font-bold text-xs rounded-lg hover:bg-brand-dim"
              >
                Back to map
              </Link>
            </div>
          ) : (
            <>
              {/* Hand diagram + keyboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
                  <div className="text-xs font-mono text-slate-500 mb-4 uppercase tracking-wide">
                    Finger placement
                  </div>
                  <HandDiagram activeFingers={lesson.targetFingers} />
                </div>
                <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl overflow-x-auto">
                  <div className="text-xs font-mono text-slate-500 mb-4 uppercase tracking-wide">
                    Keys to focus on
                  </div>
                  <KeyboardHeatmap
                    heatmap={{}}
                    highlightKeys={lesson.targetKeys.map((k) => k.toLowerCase())}
                    showFingerColors={false}
                    compact
                  />
                </div>
              </div>

              <LessonRunner lesson={lesson} />
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
