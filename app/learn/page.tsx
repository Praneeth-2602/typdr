"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { PageLoader } from "@/components/PageLoader";
import { LessonMap } from "@/components/learn/LessonMap";
import { CURRICULUM, isLessonPassed } from "@/lib/data/curriculum";
import { useAnalyticsStore } from "@/lib/stores/analytics";

export default function LearnPage() {
  const { status } = useSession();
  const lessonProgress = useAnalyticsStore((s) => s.lessonProgress);

  if (status === "loading") {
    return <PageLoader />;
  }

  const passedCount = CURRICULUM.filter((l) =>
    isLessonPassed(l, lessonProgress[l.id])
  ).length;

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

      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="font-mono font-bold text-3xl text-slate-100 mb-2">
            Learn to type
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Thirty lessons from home-row foundations to real-world typing.
            Pass each lesson to unlock the next.
          </p>
          <div className="mt-4 flex items-center gap-4 font-mono text-xs text-slate-500">
            <span>
              <span className="text-brand font-bold text-sm">{passedCount}</span>
              <span className="ml-1">/ {CURRICULUM.length} passed</span>
            </span>
            <div className="flex-1 max-w-xs h-1.5 bg-surface-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all"
                style={{
                  width: `${(passedCount / CURRICULUM.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </motion.div>

        <LessonMap lessonProgress={lessonProgress} />
      </div>
    </div>
  );
}
