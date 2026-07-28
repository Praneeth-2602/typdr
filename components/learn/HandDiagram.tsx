"use client";

import { FINGER_COLORS, type Finger } from "@/lib/data/keyboard";
import clsx from "clsx";

interface HandDiagramProps {
  activeFingers?: Finger[];
  className?: string;
}

const LEFT_FINGERS: { id: Finger; label: string; x: number }[] = [
  { id: "left-pinky", label: "LP", x: 8 },
  { id: "left-ring", label: "LR", x: 28 },
  { id: "left-middle", label: "LM", x: 48 },
  { id: "left-index", label: "LI", x: 68 },
];

const RIGHT_FINGERS: { id: Finger; label: string; x: number }[] = [
  { id: "right-index", label: "RI", x: 8 },
  { id: "right-middle", label: "RM", x: 28 },
  { id: "right-ring", label: "RR", x: 48 },
  { id: "right-pinky", label: "RP", x: 68 },
];

function FingerRect({
  finger,
  x,
  active,
}: {
  finger: Finger;
  x: number;
  active: boolean;
}) {
  const color = FINGER_COLORS[finger];
  const height = finger.includes("middle") ? 52 : finger.includes("index") || finger.includes("ring") ? 46 : 40;
  const y = 70 - height;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={14}
        height={height}
        rx={5}
        ry={5}
        fill={active ? color : "#1e1e24"}
        stroke={active ? color : "#2a2a30"}
        strokeWidth={active ? 2 : 1}
        opacity={active ? 1 : 0.7}
        className="transition-all duration-200"
      />
      {active && (
        <circle cx={x + 7} cy={y - 6} r={3} fill={color} className="animate-pulse" />
      )}
    </g>
  );
}

export function HandDiagram({ activeFingers = [], className }: HandDiagramProps) {
  const activeSet = new Set(activeFingers);

  const mobileLabels = activeFingers.map((f) => {
    const side = f.startsWith("left") ? "Left" : "Right";
    const part = f.split("-")[1];
    return `${side} ${part}`;
  });

  return (
    <div className={clsx("w-full", className)}>
      {/* Desktop SVG */}
      <div className="hidden sm:flex items-end justify-center gap-10">
        <svg viewBox="0 0 100 80" className="w-40 h-28" aria-label="Left hand">
          <text x="50" y="10" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="monospace">
            LEFT
          </text>
          {/* Palm */}
          <rect x="12" y="58" width="66" height="18" rx={6} fill="#16161a" stroke="#2a2a30" strokeWidth={1} />
          {/* Thumb */}
          <rect
            x={78}
            y={52}
            width={12}
            height={24}
            rx={5}
            fill={activeSet.has("left-thumb") ? FINGER_COLORS["left-thumb"] : "#1e1e24"}
            stroke={activeSet.has("left-thumb") ? FINGER_COLORS["left-thumb"] : "#2a2a30"}
            strokeWidth={1}
            transform="rotate(25 84 64)"
          />
          {LEFT_FINGERS.map((f) => (
            <FingerRect key={f.id} finger={f.id} x={f.x} active={activeSet.has(f.id)} />
          ))}
        </svg>

        <svg viewBox="0 0 100 80" className="w-40 h-28" aria-label="Right hand">
          <text x="50" y="10" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="monospace">
            RIGHT
          </text>
          <rect x="22" y="58" width="66" height="18" rx={6} fill="#16161a" stroke="#2a2a30" strokeWidth={1} />
          <rect
            x={8}
            y={52}
            width={12}
            height={24}
            rx={5}
            fill={activeSet.has("right-thumb") ? FINGER_COLORS["right-thumb"] : "#1e1e24"}
            stroke={activeSet.has("right-thumb") ? FINGER_COLORS["right-thumb"] : "#2a2a30"}
            strokeWidth={1}
            transform="rotate(-25 14 64)"
          />
          {RIGHT_FINGERS.map((f) => (
            <FingerRect key={f.id} finger={f.id} x={f.x + 14} active={activeSet.has(f.id)} />
          ))}
        </svg>
      </div>

      {/* Mobile callout */}
      <div className="sm:hidden text-center">
        {mobileLabels.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {activeFingers.map((f) => (
              <span
                key={f}
                className="px-2.5 py-1 rounded-md font-mono text-xs border"
                style={{
                  color: FINGER_COLORS[f],
                  borderColor: `${FINGER_COLORS[f]}55`,
                  background: `${FINGER_COLORS[f]}18`,
                }}
              >
                {f.replace("-", " ")}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs font-mono text-slate-600">All fingers — home row ready</p>
        )}
      </div>
    </div>
  );
}
