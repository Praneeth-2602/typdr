"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  THEMES,
  applyTheme,
  loadPersistedThemeId,
  persistThemeId,
} from "@/lib/data/themes";

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("default");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load + apply persisted theme on mount
  useEffect(() => {
    const id = loadPersistedThemeId();
    const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
    setActiveId(theme.id);
    applyTheme(theme);
  }, []);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectTheme(id: string) {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme) return;
    setActiveId(id);
    persistThemeId(id);
    applyTheme(theme);
  }

  const active = THEMES.find((t) => t.id === activeId) ?? THEMES[0];

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change theme"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-surface-border text-slate-500 hover:text-slate-200 hover:border-slate-600 transition-all font-mono text-xs"
      >
        <Palette size={13} />
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/10 flex-shrink-0"
          style={{ backgroundColor: active.vars["--brand"] }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-surface-border bg-[rgba(14,14,16,0.97)] shadow-2xl backdrop-blur-sm overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-surface-border">
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
                Theme
              </div>
            </div>
            <div className="p-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left group"
                >
                  {/* Color swatch */}
                  <div
                    className="w-7 h-7 rounded-lg border border-white/10 flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: theme.vars["--bg"] }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.vars["--brand"] }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                      {theme.name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                      {theme.vibe}
                    </div>
                  </div>
                  {activeId === theme.id && (
                    <Check size={12} className="text-brand flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
