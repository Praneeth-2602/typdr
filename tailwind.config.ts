/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "Fira Code", "monospace"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "#0e0e10",
          secondary: "#141416",
          tertiary: "#1a1a1e",
          border: "#2a2a30",
          hover: "#222228",
        },
        brand: {
          DEFAULT: "#e8f55c",   // neon-lime accent
          dim: "#c9d94e",
          muted: "#b5c240",
        },
        correct: "#4ade80",
        incorrect: "#f87171",
        pending: "#94a3b8",
        cursor: "#e8f55c",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
        "key-press": {
          "0%": { transform: "scale(1)", backgroundColor: "transparent" },
          "50%": { transform: "scale(0.92)", backgroundColor: "#e8f55c22" },
          "100%": { transform: "scale(1)", backgroundColor: "transparent" },
        },
        "slide-up": {
          from: { opacity: 0, transform: "translateY(12px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "key-press": "key-press 0.12s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
