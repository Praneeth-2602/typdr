// ─────────────────────────────────────────────────────────────────────────────
// themes.ts — curated color themes for typdr
// Each theme overrides CSS custom properties at the :root level.
// ─────────────────────────────────────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  /** Short flavor description shown in the picker */
  vibe: string;
  vars: {
    // Hex vars (used by non-tailwind CSS/inline styles)
    "--bg":             string;
    "--surface":        string;
    "--surface-2":      string;
    "--surface-3":      string;
    "--surface-border": string;
    "--surface-hover":  string;
    "--brand":          string;
    "--brand-dim":      string;
    "--brand-muted":    string;
    "--correct":        string;
    "--incorrect":      string;
    "--pending":        string;
    "--cursor-color":   string;

    // RGB vars (used by tailwind colors with opacity modifiers)
    "--surface-rgb":        string; // "r g b"
    "--surface-2-rgb":      string;
    "--surface-3-rgb":      string;
    "--surface-border-rgb": string;
    "--surface-hover-rgb":  string;

    "--brand-rgb":       string;
    "--brand-dim-rgb":   string;
    "--brand-muted-rgb": string;

    "--correct-rgb":   string;
    "--incorrect-rgb": string;
    "--pending-rgb":   string;
    "--cursor-rgb":    string;

    "--text-primary":   string;
    "--text-secondary": string;
  };
  /** Tailwind-compatible body bg for server-side matching (used in globals.css fallback) */
  bodyBg: string;
}

export const THEMES: Theme[] = [
  {
    id: "default",
    name: "typdr",
    vibe: "Dark + neon lime",
    bodyBg: "#0e0e10",
    vars: {
      "--bg":             "#0e0e10",
      "--surface":        "#0e0e10",
      "--surface-2":      "#141416",
      "--surface-3":      "#1a1a1e",
      "--surface-border": "#2a2a30",
      "--surface-hover":  "#222228",
      "--brand":          "#e8f55c",
      "--brand-dim":      "#c9d94e",
      "--brand-muted":    "#b5c240",
      "--correct":        "#4ade80",
      "--incorrect":      "#f87171",
      "--pending":        "#94a3b8",
      "--cursor-color":   "#e8f55c",
      "--surface-rgb":        "14 14 16",
      "--surface-2-rgb":      "20 20 22",
      "--surface-3-rgb":      "26 26 30",
      "--surface-border-rgb": "42 42 48",
      "--surface-hover-rgb":  "34 34 40",
      "--brand-rgb":          "232 245 92",
      "--brand-dim-rgb":      "201 217 78",
      "--brand-muted-rgb":    "181 194 64",
      "--correct-rgb":       "74 222 128",
      "--incorrect-rgb":     "248 113 113",
      "--pending-rgb":       "148 163 184",
      "--cursor-rgb":        "232 245 92",
      "--text-primary":   "#e2e8f0",
      "--text-secondary": "#94a3b8",
    },
  },
  {
    id: "moonlit",
    name: "Moonlit",
    vibe: "Dark blue-grey + ice blue",
    bodyBg: "#0c0e14",
    vars: {
      "--bg":             "#0c0e14",
      "--surface":        "#0c0e14",
      "--surface-2":      "#12151e",
      "--surface-3":      "#191d28",
      "--surface-border": "#252a3a",
      "--surface-hover":  "#1e2332",
      "--brand":          "#93c5fd",
      "--brand-dim":      "#60a5fa",
      "--brand-muted":    "#7aa7ff",
      "--correct":        "#6ee7b7",
      "--incorrect":      "#fca5a5",
      "--pending":        "#93a3b8",
      "--cursor-color":   "#93c5fd",
      "--surface-rgb":        "12 14 20",
      "--surface-2-rgb":      "18 21 30",
      "--surface-3-rgb":      "25 29 40",
      "--surface-border-rgb": "37 42 58",
      "--surface-hover-rgb":  "30 35 50",
      "--brand-rgb":          "147 197 253",
      "--brand-dim-rgb":      "96 165 250",
      "--brand-muted-rgb":    "122 167 255",
      "--correct-rgb":       "110 231 183",
      "--incorrect-rgb":     "252 165 165",
      "--pending-rgb":       "147 163 184",
      "--cursor-rgb":        "147 197 253",
      "--text-primary":   "#e2e8f0",
      "--text-secondary": "#7d8fa8",
    },
  },
  {
    id: "ember",
    name: "Ember",
    vibe: "Very dark + orange-red",
    bodyBg: "#0d0a08",
    vars: {
      "--bg":             "#0d0a08",
      "--surface":        "#0d0a08",
      "--surface-2":      "#141008",
      "--surface-3":      "#1c1510",
      "--surface-border": "#2e2018",
      "--surface-hover":  "#241a10",
      "--brand":          "#fb923c",
      "--brand-dim":      "#ea7020",
      "--brand-muted":    "#f59e0b",
      "--correct":        "#86efac",
      "--incorrect":      "#f87171",
      "--pending":        "#94a3b8",
      "--cursor-color":   "#fb923c",
      "--surface-rgb":        "13 10 8",
      "--surface-2-rgb":      "20 16 8",
      "--surface-3-rgb":      "28 21 16",
      "--surface-border-rgb": "46 32 24",
      "--surface-hover-rgb":  "36 26 16",
      "--brand-rgb":          "251 146 60",
      "--brand-dim-rgb":      "234 112 32",
      "--brand-muted-rgb":    "245 158 11",
      "--correct-rgb":       "134 239 172",
      "--incorrect-rgb":     "248 113 113",
      "--pending-rgb":       "148 163 184",
      "--cursor-rgb":        "251 146 60",
      "--text-primary":   "#fef3e2",
      "--text-secondary": "#9c8070",
    },
  },
  {
    id: "matcha",
    name: "Matcha",
    vibe: "Dark green + soft green",
    bodyBg: "#090d0c",
    vars: {
      "--bg":             "#090d0c",
      "--surface":        "#090d0c",
      "--surface-2":      "#0e1410",
      "--surface-3":      "#131a14",
      "--surface-border": "#1f2e20",
      "--surface-hover":  "#192618",
      "--brand":          "#86efac",
      "--brand-dim":      "#4ade80",
      "--brand-muted":    "#22c55e",
      "--correct":        "#a7f3d0",
      "--incorrect":      "#fca5a5",
      "--pending":        "#94a3b8",
      "--cursor-color":   "#86efac",
      "--surface-rgb":        "9 13 12",
      "--surface-2-rgb":      "14 20 16",
      "--surface-3-rgb":      "19 26 20",
      "--surface-border-rgb": "31 46 32",
      "--surface-hover-rgb":  "25 38 24",
      "--brand-rgb":          "134 239 172",
      "--brand-dim-rgb":      "74 222 128",
      "--brand-muted-rgb":    "34 197 94",
      "--correct-rgb":       "167 243 208",
      "--incorrect-rgb":     "252 165 165",
      "--pending-rgb":       "148 163 184",
      "--cursor-rgb":        "134 239 172",
      "--text-primary":   "#e8f5ee",
      "--text-secondary": "#6a8a72",
    },
  },
  {
    id: "sakura",
    name: "Sakura",
    vibe: "Near-black + pink",
    bodyBg: "#0e0a0d",
    vars: {
      "--bg":             "#0e0a0d",
      "--surface":        "#0e0a0d",
      "--surface-2":      "#160f15",
      "--surface-3":      "#1d141c",
      "--surface-border": "#2e1f2c",
      "--surface-hover":  "#261820",
      "--brand":          "#f9a8d4",
      "--brand-dim":      "#ec4899",
      "--brand-muted":    "#f472b6",
      "--correct":        "#c4b5fd",
      "--incorrect":      "#fca5a5",
      "--pending":        "#94a3b8",
      "--cursor-color":   "#f9a8d4",
      "--surface-rgb":        "14 10 13",
      "--surface-2-rgb":      "22 15 21",
      "--surface-3-rgb":      "29 20 28",
      "--surface-border-rgb": "46 31 44",
      "--surface-hover-rgb":  "38 24 32",
      "--brand-rgb":          "249 168 212",
      "--brand-dim-rgb":      "236 72 153",
      "--brand-muted-rgb":    "244 114 182",
      "--correct-rgb":       "196 181 253",
      "--incorrect-rgb":     "252 165 165",
      "--pending-rgb":       "148 163 184",
      "--cursor-rgb":        "249 168 212",
      "--text-primary":   "#fde8f0",
      "--text-secondary": "#9a7090",
    },
  },
  {
    id: "paper",
    name: "Paper",
    vibe: "Off-white + black",
    bodyBg: "#f5f0e8",
    vars: {
      "--bg":             "#f5f0e8",
      "--surface":        "#f5f0e8",
      "--surface-2":      "#ede8e0",
      "--surface-3":      "#e4dfd8",
      "--surface-border": "#ccc8c0",
      "--surface-hover":  "#e8e3db",
      "--brand":          "#1a1a1a",
      "--brand-dim":      "#333333",
      "--brand-muted":    "#222222",
      "--correct":        "#16a34a",
      "--incorrect":      "#dc2626",
      "--pending":        "#475569",
      "--cursor-color":   "#1a1a1a",
      "--surface-rgb":        "245 240 232",
      "--surface-2-rgb":      "237 232 224",
      "--surface-3-rgb":      "228 223 216",
      "--surface-border-rgb": "204 200 192",
      "--surface-hover-rgb":  "232 227 219",
      "--brand-rgb":          "26 26 26",
      "--brand-dim-rgb":      "51 51 51",
      "--brand-muted-rgb":    "34 34 34",
      "--correct-rgb":       "22 163 74",
      "--incorrect-rgb":     "220 38 38",
      "--pending-rgb":       "71 85 105",
      "--cursor-rgb":        "26 26 26",
      "--text-primary":   "#1a1a1a",
      "--text-secondary": "#6b6b6b",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    vibe: "Pure black + purple",
    bodyBg: "#080810",
    vars: {
      "--bg":             "#080810",
      "--surface":        "#080810",
      "--surface-2":      "#0e0e1a",
      "--surface-3":      "#141422",
      "--surface-border": "#22223a",
      "--surface-hover":  "#1a1a2e",
      "--brand":          "#a78bfa",
      "--brand-dim":      "#7c3aed",
      "--brand-muted":    "#8b5cf6",
      "--correct":        "#6ee7b7",
      "--incorrect":      "#f87171",
      "--pending":        "#94a3b8",
      "--cursor-color":   "#a78bfa",
      "--surface-rgb":        "8 8 16",
      "--surface-2-rgb":      "14 14 26",
      "--surface-3-rgb":      "20 20 34",
      "--surface-border-rgb": "34 34 58",
      "--surface-hover-rgb":  "26 26 46",
      "--brand-rgb":          "167 139 250",
      "--brand-dim-rgb":      "124 58 237",
      "--brand-muted-rgb":    "139 92 246",
      "--correct-rgb":       "110 231 183",
      "--incorrect-rgb":     "248 113 113",
      "--pending-rgb":       "148 163 184",
      "--cursor-rgb":        "167 139 250",
      "--text-primary":   "#ede9fe",
      "--text-secondary": "#8070a8",
    },
  },
  {
    id: "retro",
    name: "Retro",
    vibe: "Dark + amber / CRT green",
    bodyBg: "#080a04",
    vars: {
      "--bg":             "#080a04",
      "--surface":        "#080a04",
      "--surface-2":      "#0f1208",
      "--surface-3":      "#161a0c",
      "--surface-border": "#252c14",
      "--surface-hover":  "#1c2210",
      "--brand":          "#d97706",
      "--brand-dim":      "#b45309",
      "--brand-muted":    "#a16207",
      "--correct":        "#84cc16",
      "--incorrect":      "#ef4444",
      "--pending":        "#94a3b8",
      "--cursor-color":   "#d97706",
      "--surface-rgb":        "8 10 4",
      "--surface-2-rgb":      "15 18 8",
      "--surface-3-rgb":      "22 26 12",
      "--surface-border-rgb": "37 44 20",
      "--surface-hover-rgb":  "28 34 16",
      "--brand-rgb":          "217 119 6",
      "--brand-dim-rgb":      "180 83 9",
      "--brand-muted-rgb":    "161 98 7",
      "--correct-rgb":       "132 204 22",
      "--incorrect-rgb":     "239 68 68",
      "--pending-rgb":       "148 163 184",
      "--cursor-rgb":        "217 119 6",
      "--text-primary":   "#fef9c3",
      "--text-secondary": "#808040",
    },
  },
];

export const DEFAULT_THEME_ID = "default";

/** Apply a theme by writing CSS custom properties to :root */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  // Also update body background for hard-coded bg-surface classes
  document.body.style.backgroundColor = theme.vars["--bg"];
}

/** Load persisted theme id from localStorage */
export function loadPersistedThemeId(): string {
  try {
    return localStorage.getItem("typdr-theme") ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

/** Persist theme id to localStorage */
export function persistThemeId(id: string) {
  try {
    localStorage.setItem("typdr-theme", id);
  } catch {
    // ignore
  }
}
