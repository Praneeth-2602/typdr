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
  "left-pinky":   "#f472b6",
  "left-ring":    "#a78bfa",
  "left-middle":  "#60a5fa",
  "left-index":   "#34d399",
  "left-thumb":   "#94a3b8",
  "right-thumb":  "#94a3b8",
  "right-index":  "#fbbf24",
  "right-middle": "#fb923c",
  "right-ring":   "#f87171",
  "right-pinky":  "#e879f9",
};

/** Physical finger positions for a standard ANSI board (unchanged across layouts). */
const NUMBER_ROW: KeyInfo[] = [
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
];

function row(
  keys: string[],
  fingers: Finger[],
  rowName: KeyInfo["row"],
  homeIdx: number[] = []
): KeyInfo[] {
  return keys.map((key, i) => ({
    key,
    finger: fingers[i],
    row: rowName,
    ...(homeIdx.includes(i) ? { isHomeKey: true } : {}),
  }));
}

const LEFT_TOP: Finger[] = [
  "left-pinky", "left-ring", "left-middle", "left-index", "left-index",
];
const RIGHT_TOP: Finger[] = [
  "right-index", "right-index", "right-middle", "right-ring", "right-pinky",
  "right-pinky", "right-pinky", "right-pinky",
];
const LEFT_HOME: Finger[] = [
  "left-pinky", "left-ring", "left-middle", "left-index", "left-index",
];
const RIGHT_HOME: Finger[] = [
  "right-index", "right-index", "right-middle", "right-ring", "right-pinky", "right-pinky",
];
const LEFT_BOT: Finger[] = [
  "left-pinky", "left-ring", "left-middle", "left-index", "left-index",
];
const RIGHT_BOT: Finger[] = [
  "right-index", "right-index", "right-middle", "right-ring", "right-pinky",
];

const QWERTY: KeyInfo[][] = [
  NUMBER_ROW,
  row(["q","w","e","r","t","y","u","i","o","p","[","]","\\"], [...LEFT_TOP, ...RIGHT_TOP], "top"),
  row(["a","s","d","f","g","h","j","k","l",";","'"], [...LEFT_HOME, ...RIGHT_HOME], "home", [0,1,2,3,6,7,8,9]),
  row(["z","x","c","v","b","n","m",",",".","/"], [...LEFT_BOT, ...RIGHT_BOT], "bottom"),
];

const DVORAK: KeyInfo[][] = [
  NUMBER_ROW,
  row(["'",",",".","p","y","f","g","c","r","l","/","=","\\"], [...LEFT_TOP, ...RIGHT_TOP], "top"),
  row(["a","o","e","u","i","d","h","t","n","s","-"], [...LEFT_HOME, ...RIGHT_HOME], "home", [0,1,2,3,6,7,8,9]),
  row([";","q","j","k","x","b","m","w","v","z"], [...LEFT_BOT, ...RIGHT_BOT], "bottom"),
];

const COLEMAK: KeyInfo[][] = [
  NUMBER_ROW,
  row(["q","w","f","p","g","j","l","u","y",";","[","]","\\"], [...LEFT_TOP, ...RIGHT_TOP], "top"),
  row(["a","r","s","t","d","h","n","e","i","o","'"], [...LEFT_HOME, ...RIGHT_HOME], "home", [0,1,2,3,6,7,8,9]),
  row(["z","x","c","v","b","k","m",",",".","/"], [...LEFT_BOT, ...RIGHT_BOT], "bottom"),
];

const COLEMAK_DH: KeyInfo[][] = [
  NUMBER_ROW,
  row(["q","w","f","p","b","j","l","u","y",";","[","]","\\"], [...LEFT_TOP, ...RIGHT_TOP], "top"),
  row(["a","r","s","t","g","m","n","e","i","o","'"], [...LEFT_HOME, ...RIGHT_HOME], "home", [0,1,2,3,6,7,8,9]),
  row(["z","x","c","d","v","k","h",",",".","/"], [...LEFT_BOT, ...RIGHT_BOT], "bottom"),
];

const WORKMAN: KeyInfo[][] = [
  NUMBER_ROW,
  row(["q","d","r","w","b","j","f","u","p",";","[","]","\\"], [...LEFT_TOP, ...RIGHT_TOP], "top"),
  row(["a","s","h","t","g","y","n","e","o","i","'"], [...LEFT_HOME, ...RIGHT_HOME], "home", [0,1,2,3,6,7,8,9]),
  row(["z","x","m","c","v","k","l",",",".","/"], [...LEFT_BOT, ...RIGHT_BOT], "bottom"),
];

export const LAYOUTS = {
  qwerty:    QWERTY,
  dvorak:    DVORAK,
  colemak:   COLEMAK,
  colemakDh: COLEMAK_DH,
  workman:   WORKMAN,
} as const;

export type Layout = keyof typeof LAYOUTS;

export const LAYOUT_LABELS: Record<Layout, string> = {
  qwerty: "QWERTY",
  dvorak: "Dvorak",
  colemak: "Colemak",
  colemakDh: "Colemak-DH",
  workman: "Workman",
};

/** @deprecated Prefer LAYOUTS.qwerty — kept for existing imports */
export const KEYBOARD_LAYOUT: KeyInfo[][] = LAYOUTS.qwerty;

export function getLayout(layout: Layout = "qwerty"): KeyInfo[][] {
  return LAYOUTS[layout] ?? LAYOUTS.qwerty;
}

export function getKeyInfo(key: string, layout: Layout = "qwerty"): KeyInfo | undefined {
  const k = key.toLowerCase();
  for (const rowKeys of getLayout(layout)) {
    const found = rowKeys.find((ki) => ki.key === k);
    if (found) return found;
  }
  return undefined;
}

export const LAYOUT_STORAGE_KEY = "typdr-layout";

export function loadSavedLayout(): Layout {
  if (typeof window === "undefined") return "qwerty";
  const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (raw && raw in LAYOUTS) return raw as Layout;
  return "qwerty";
}

export function saveLayout(layout: Layout) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
}
