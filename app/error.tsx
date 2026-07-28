"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = useMemo(() => {
    const m = error?.message || "Something went wrong.";
    // Keep it short for UI.
    return m.length > 140 ? `${m.slice(0, 137)}…` : m;
  }, [error]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-red-900/40 bg-red-950/20 px-4 py-2 mb-5 font-mono text-xs text-red-200">
          <AlertTriangle size={14} />
          Error
        </div>

        <h1 className="font-mono font-bold text-2xl text-slate-100 mb-3">
          We couldn’t load this page.
        </h1>
        <p className="text-sm font-mono text-slate-500 mb-6 whitespace-pre-wrap">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-brand text-surface font-mono font-bold text-sm rounded-lg hover:bg-brand-dim transition-all"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.assign("/")}
            className="px-5 py-2.5 border border-surface-border bg-surface-secondary/60 font-mono text-sm text-slate-300 rounded-lg hover:bg-surface-hover transition-all"
          >
            Go home
          </button>
        </div>
      </motion.div>
    </div>
  );
}

