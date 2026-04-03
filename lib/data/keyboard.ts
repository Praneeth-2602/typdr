export type Finger =
  | "left-pinky"
  | "left-ring"
  | "left-middle"
  | "left-index"
  | "left-thumb"
  | "right-thumb"
  | "right-index"
  | "right-middle"
  | "right-ring"
  | "right-pinky";

export interface KeyInfo {
  key: string;
  finger: Finger;
  row: "number" | "top" | "home" | "bottom";
  isHomeKey?: boolean;
}

export const FINGER_COLORS: Record<Finger, string> = {
  "left-pinky":   "#f472b6", // pink
  "left-ring":    "#a78bfa", // violet
  "left-middle":  "#60a5fa", // blue
  "left-index":   "#34d399", // emerald
  "left-thumb":   "#94a3b8", // slate
  "right-thumb":  "#94a3b8", // slate
  "right-index":  "#fbbf24", // amber
  "right-middle": "#fb923c", // orange
  "right-ring":   "#f87171", // red
  "right-pinky":  "#e879f9", // fuchsia
};

export const KEYBOARD_LAYOUT: KeyInfo[][] = [
  // Number row
  [
    { key: "`", finger: "left-pinky",   row: "number" },
    { key: "1", finger: "left-pinky",   row: "number" },
    { key: "2", finger: "left-ring",    row: "number" },
    { key: "3", finger: "left-middle",  row: "number" },
    { key: "4", finger: "left-index",   row: "number" },
    { key: "5", finger: "left-index",   row: "number" },
    { key: "6", finger: "right-index",  row: "number" },
    { key: "7", finger: "right-index",  row: "number" },
    { key: "8", finger: "right-middle", row: "number" },
    { key: "9", finger: "right-ring",   row: "number" },
    { key: "0", finger: "right-pinky",  row: "number" },
    { key: "-", finger: "right-pinky",  row: "number" },
    { key: "=", finger: "right-pinky",  row: "number" },
  ],
  // Top row
  [
    { key: "q", finger: "left-pinky",   row: "top" },
    { key: "w", finger: "left-ring",    row: "top" },
    { key: "e", finger: "left-middle",  row: "top" },
    { key: "r", finger: "left-index",   row: "top" },
    { key: "t", finger: "left-index",   row: "top" },
    { key: "y", finger: "right-index",  row: "top" },
    { key: "u", finger: "right-index",  row: "top" },
    { key: "i", finger: "right-middle", row: "top" },
    { key: "o", finger: "right-ring",   row: "top" },
    { key: "p", finger: "right-pinky",  row: "top" },
    { key: "[", finger: "right-pinky",  row: "top" },
    { key: "]", finger: "right-pinky",  row: "top" },
    { key: "\\",finger: "right-pinky",  row: "top" },
  ],
  // Home row
  [
    { key: "a", finger: "left-pinky",   row: "home", isHomeKey: true },
    { key: "s", finger: "left-ring",    row: "home", isHomeKey: true },
    { key: "d", finger: "left-middle",  row: "home", isHomeKey: true },
    { key: "f", finger: "left-index",   row: "home", isHomeKey: true },
    { key: "g", finger: "left-index",   row: "home" },
    { key: "h", finger: "right-index",  row: "home" },
    { key: "j", finger: "right-index",  row: "home", isHomeKey: true },
    { key: "k", finger: "right-middle", row: "home", isHomeKey: true },
    { key: "l", finger: "right-ring",   row: "home", isHomeKey: true },
    { key: ";", finger: "right-pinky",  row: "home", isHomeKey: true },
    { key: "'", finger: "right-pinky",  row: "home" },
  ],
  // Bottom row
  [
    { key: "z", finger: "left-pinky",   row: "bottom" },
    { key: "x", finger: "left-ring",    row: "bottom" },
    { key: "c", finger: "left-middle",  row: "bottom" },
    { key: "v", finger: "left-index",   row: "bottom" },
    { key: "b", finger: "left-index",   row: "bottom" },
    { key: "n", finger: "right-index",  row: "bottom" },
    { key: "m", finger: "right-index",  row: "bottom" },
    { key: ",", finger: "right-middle", row: "bottom" },
    { key: ".", finger: "right-ring",   row: "bottom" },
    { key: "/", finger: "right-pinky",  row: "bottom" },
  ],
];

export function getKeyInfo(key: string): KeyInfo | undefined {
  const k = key.toLowerCase();
  for (const row of KEYBOARD_LAYOUT) {
    const found = row.find((ki) => ki.key === k);
    if (found) return found;
  }
  return undefined;
}
