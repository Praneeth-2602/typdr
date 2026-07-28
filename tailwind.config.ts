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
        // Themeable colors (set by lib/data/themes.ts via CSS variables)
        // Note: using rgb(var(--x-rgb) / <alpha-value>) so tailwind opacity modifiers like /50 work.
        surface: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          secondary: "rgb(var(--surface-2-rgb) / <alpha-value>)",
          tertiary: "rgb(var(--surface-3-rgb) / <alpha-value>)",
          border: "rgb(var(--surface-border-rgb) / <alpha-value>)",
          hover: "rgb(var(--surface-hover-rgb) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          dim: "rgb(var(--brand-dim-rgb) / <alpha-value>)",
          muted: "rgb(var(--brand-muted-rgb) / <alpha-value>)",
        },
        correct: "rgb(var(--correct-rgb) / <alpha-value>)",
        incorrect: "rgb(var(--incorrect-rgb) / <alpha-value>)",
        pending: "rgb(var(--pending-rgb) / <alpha-value>)",
        cursor: "rgb(var(--cursor-rgb) / <alpha-value>)",
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
