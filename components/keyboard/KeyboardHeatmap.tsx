"use client";

import clsx from "clsx";
import { KEYBOARD_LAYOUT, FINGER_COLORS } from "@/lib/data/keyboard";

interface KeyboardHeatmapProps {
  heatmap: Record<string, { accuracy: number; volume: number }>;
  highlightKeys?: string[];
  showFingerColors?: boolean;
  activeKey?: string;
  compact?: boolean;
}

const ROW_OFFSETS = [0, 0.5, 0.75, 1.25]; // em offsets for each row

function getHeatColor(accuracy: number, volume: number): string {
  if (volume === 0) return "transparent";
  if (accuracy >= 97) return "#4ade8022"; // green tint
  if (accuracy >= 90) return "#fbbf2422"; // amber
  if (accuracy >= 80) return "#fb923c33"; // orange
  return "#f8717133"; // red
}

function getTextColor(accuracy: number, volume: number): string {
  if (volume === 0) return "#475569";
  if (accuracy >= 97) return "#4ade80";
  if (accuracy >= 90) return "#fbbf24";
  if (accuracy >= 80) return "#fb923c";
  return "#f87171";
}

export function KeyboardHeatmap({
  heatmap,
  highlightKeys = [],
  showFingerColors = false,
  activeKey,
  compact = false,
}: KeyboardHeatmapProps) {
  const keySize = compact ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";

  return (
    <div className="font-mono select-none">
      {KEYBOARD_LAYOUT.map((row, rowIdx) => {
        const offset = ROW_OFFSETS[rowIdx];
        return (
          <div
            key={rowIdx}
            className="flex items-center gap-1 mb-1"
            style={{ paddingLeft: `${offset * (compact ? 28 : 40)}px` }}
          >
            {row.map((keyInfo) => {
              const k = keyInfo.key;
              const data = heatmap[k];
              const isHighlighted = highlightKeys.includes(k);
              const isActive = activeKey?.toLowerCase() === k;
              const fingerColor = FINGER_COLORS[keyInfo.finger];

              const bg = data
                ? getHeatColor(data.accuracy, data.volume)
                : isHighlighted
                ? "#e8f55c22"
                : "transparent";

              const textColor = data
                ? getTextColor(data.accuracy, data.volume)
                : isHighlighted
                ? "#e8f55c"
                : "#475569";

              const borderColor = isActive
                ? "#e8f55c"
                : isHighlighted
                ? "#e8f55c66"
                : keyInfo.isHomeKey
                ? "#3a3a50"
                : "#2a2a30";

              return (
                <div
                  key={k}
                  className={clsx(
                    keySize,
                    "relative flex flex-col items-center justify-center rounded border transition-all duration-100",
                    isActive && "scale-95 brightness-150"
                  )}
                  style={{
                    background: showFingerColors ? `${fingerColor}18` : bg,
                    borderColor: showFingerColors ? `${fingerColor}55` : borderColor,
                    color: showFingerColors ? fingerColor : textColor,
                  }}
                  title={
                    data
                      ? `${k}: ${data.accuracy}% accuracy (${data.volume} typed)`
                      : k
                  }
                >
                  {/* Home key indicator dot */}
                  {keyInfo.isHomeKey && !compact && (
                    <span
                      className="absolute bottom-0.5 w-1 h-1 rounded-full"
                      style={{
                        background: showFingerColors ? fingerColor : "#4a4a60",
                      }}
                    />
                  )}
                  <span className="font-bold leading-none">{k}</span>
                  {data && data.volume > 0 && !compact && (
                    <span
                      className="absolute -top-1 -right-1 text-[8px] font-bold px-0.5 rounded"
                      style={{ background: "#0e0e10", color: textColor }}
                    >
                      {data.accuracy}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Spacebar */}
      <div className="flex mt-1" style={{ paddingLeft: compact ? "100px" : "140px" }}>
        <div
          className={clsx(
            "h-7 rounded border transition-all duration-100",
            compact ? "w-40" : "w-52"
          )}
          style={{
            background: "transparent",
            borderColor: "#2a2a30",
          }}
        />
      </div>

      {/* Legend */}
      {!compact && Object.keys(heatmap).length > 0 && (
        <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-correct/20 border border-correct/30 inline-block" />
            ≥97%
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-400/20 border border-amber-400/30 inline-block" />
            90–97%
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-400/20 border border-orange-400/30 inline-block" />
            80–90%
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-incorrect/20 border border-incorrect/30 inline-block" />
            &lt;80%
          </div>
        </div>
      )}
    </div>
  );
}
