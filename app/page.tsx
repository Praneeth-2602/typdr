"use client";

import Link from "next/link";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { Keyboard, BarChart3, Zap, ArrowRight, BookOpen } from "lucide-react";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { PageLoader } from "@/components/PageLoader";

const features = [
  {
    icon: <BookOpen size={20} />,
    label: "Learn",
    desc: "Finger placement, home row drills, progressive lessons from zero.",
    href: "/learn",
    accent: "#818cf8",
  },
  {
    icon: <Keyboard size={20} />,
    label: "Practice",
    desc: "Words, quotes, real code snippets, punctuation-heavy texts. Honest WPM.",
    href: "/practice",
    accent: "#e8f55c",
  },
  {
    icon: <BarChart3 size={20} />,
    label: "Analytics",
    desc: "Per-finger heatmap, slowest bigrams, session history, AI drills.",
    href: "/analytics",
    accent: "#34d399",
  },
];

const stats = [
  { value: "100%", label: "Serverless" },
  { value: "JWT", label: "Session auth" },
  { value: "∞", label: "Local fallback" },
  { value: "Free", label: "AI-powered drills" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-surface-border/50">
        <span className="font-mono font-bold text-lg tracking-tight">
          <span className="text-brand">typ</span><span className="text-sky-400">dr</span>
        </span>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <Link href="/learn" className="hover:text-slate-200">Learn</Link>
          <Link href="/practice" className="hover:text-slate-200">Practice</Link>
          <Link href="/analytics" className="hover:text-slate-200">Analytics</Link>
          <Link href="/leaderboard" className="hover:text-slate-200">Leaderboard</Link>
          <AuthButtons />
          <Link
            href="/practice"
            className="px-4 py-1.5 bg-brand text-surface font-mono font-bold text-xs rounded-md hover:bg-brand-dim"
          >
            Start typing
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-surface-tertiary border border-surface-border text-xs font-mono text-brand px-3 py-1.5 rounded-full mb-8">
            <Zap size={11} />
            Server-backed stats with local-first feel.
          </div>

          <h1 className="font-mono font-bold text-5xl md:text-7xl leading-tight text-slate-100 mb-6">
            Type faster.<br />
            <span className="text-gradient">Learn smarter.</span>
          </h1>

          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            The typing platform that fixes what Monkeytype doesn&apos;t — beginner lessons,
            per-key analytics, honest WPM, synced streaks, and AI-generated drills.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/practice"
              className="flex items-center gap-2 px-6 py-3 bg-brand text-surface font-mono font-bold text-sm rounded-lg hover:bg-brand-dim"
            >
              Start practicing <ArrowRight size={15} />
            </Link>
            <Link
              href="/learn"
              className="flex items-center gap-2 px-6 py-3 border border-surface-border text-slate-300 font-mono text-sm rounded-lg hover:bg-surface-hover"
            >
              I&apos;m a beginner
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex items-center gap-12 mt-20 flex-wrap justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-mono font-bold text-2xl text-brand">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Feature cards */}
      <section className="px-8 pb-20 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i + 0.3 }}
            >
              <Link
                href={f.href}
                className="block p-6 bg-surface-secondary border border-surface-border rounded-xl hover:border-surface-hover group transition-all"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `${f.accent}22`, color: f.accent }}
                >
                  {f.icon}
                </div>
                <div className="font-mono font-bold text-slate-100 mb-2 flex items-center gap-2">
                  {f.label}
                  <ArrowRight
                    size={13}
                    className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <div className="text-sm text-slate-500 leading-relaxed">{f.desc}</div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border/50 px-8 py-5 text-center text-xs text-slate-600 font-mono">
        typdr · next.js + mongodb · open source
      </footer>
    </div>
  );
}
