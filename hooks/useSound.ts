// ─────────────────────────────────────────────────────────────────────────────
// useSound.ts  v3 — NEW
//
// Tiny Web Audio API hook for typing sounds. Zero dependencies.
// Generates sounds procedurally (no audio files needed).
//
// Sounds:
//   keyClick   — soft click on every correct keystroke
//   keyError   — low thud on incorrect keystroke
//   testDone   — short rising chime when test finishes
//
// The AudioContext is created lazily on first user interaction to comply
// with browser autoplay policies.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useRef, useCallback, useEffect, useState } from "react";

type SoundType = "keyClick" | "keyError" | "testDone";

export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  // Create context lazily
  const getCtx = useCallback((): AudioContext | null => {
    if (!enabled) return null;
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    return ctxRef.current;
  }, [enabled]);

  const play = useCallback(
    (type: SoundType) => {
      const ctx = getCtx();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === "keyClick") {
        // Soft mechanical click: short noise burst
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(now);
      } else if (type === "keyError") {
        // Low thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "testDone") {
        // Rising three-note chime
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + i * 0.12;
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      }
    },
    [getCtx]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return { play };
}

/** Persists the sound preference in localStorage */
export function useSoundPreference() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("swiftkeys-sound");
    return stored === null ? true : stored === "true";
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("swiftkeys-sound", String(next));
      return next;
    });
  }, []);

  return { enabled, toggle };
}
