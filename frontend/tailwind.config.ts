import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        purple: {
          50:  "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
        },
        violet: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        slate: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      animation: {
        "fade-in":   "fadeIn 0.4s ease-out forwards",
        "slide-up":  "slideUp 0.4s ease-out forwards",
        "scale-in":  "scaleIn 0.3s ease-out forwards",
        "shimmer":   "shimmer 1.8s infinite",
        "spin-slow": "spin 6s linear infinite",
      },
      keyframes: {
        fadeIn:   { "0%": { opacity: "0" },                              "100%": { opacity: "1" } },
        slideUp:  { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn:  { "0%": { opacity: "0", transform: "scale(0.95)" },    "100%": { opacity: "1", transform: "scale(1)" } },
        shimmer:  { "0%": { backgroundPosition: "-200% 0" },             "100%": { backgroundPosition: "200% 0" } },
      },
      boxShadow: {
        card:    "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(139,92,246,0.06)",
        "card-hover": "0 4px 24px rgba(139,92,246,0.14), 0 1px 4px rgba(0,0,0,0.06)",
        purple:  "0 4px 20px rgba(139,92,246,0.25)",
        "purple-lg": "0 8px 32px rgba(139,92,246,0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
