"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timerRefs.current.get(id));
    timerRefs.current.delete(id);
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), 4000);
      timerRefs.current.set(id, timer);
    },
    [dismiss]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal-style fixed container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const Icon =
    toast.variant === "success"
      ? CheckCircle
      : toast.variant === "error"
      ? AlertCircle
      : Info;

  const colorMap: Record<ToastVariant, string> = {
    success: "text-green-400 border-green-900/40 bg-green-950/30",
    error: "text-red-400 border-red-900/40 bg-red-950/30",
    info: "text-sky-400 border-sky-900/40 bg-sky-950/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm min-w-[260px] max-w-[360px] ${colorMap[toast.variant]}`}
      style={{ background: "rgba(14,14,16,0.92)" }}
    >
      <Icon size={15} className="mt-0.5 flex-shrink-0" />
      <span className="font-mono text-xs text-slate-200 flex-1 leading-relaxed">
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0 mt-0.5"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}
