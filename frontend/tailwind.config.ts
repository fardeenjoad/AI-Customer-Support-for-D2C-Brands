import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-geist)", "sans-serif"],
      },
      colors: {
        background: "#F4F1EA",
        sidebar: "#EAE4D5",
        surface: "#FDFBF7",
        border: "#E5E0D8",
        primary: {
          DEFAULT: "#0F766E",
          hover: "#0D625B",
        },
        accent: {
          DEFAULT: "#14B8A6",
          hover: "#0F9F8F",
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        text: {
          primary: "#1C2E2C",
          muted: "#6B7678",
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out forwards",
        slideUp: "slideUp 0.4s ease-out forwards",
        slideIn: "slideIn 0.3s ease-out forwards",
        scaleUp: "scaleUp 0.2s ease-out forwards",
        pulseGlow: "pulseGlow 2s infinite ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(-16px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        scaleUp: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.5", filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))" },
          "50%": { opacity: "1", filter: "drop-shadow(0 0 12px rgba(6, 182, 212, 0.8))" },
        },
      },
      boxShadow: {
        glow: "0 0 15px rgba(59, 130, 246, 0.15)",
        "glow-cyan": "0 0 15px rgba(6, 182, 212, 0.2)",
        "glow-success": "0 0 15px rgba(16, 185, 129, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
