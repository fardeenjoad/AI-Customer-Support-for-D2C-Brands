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
        background: "#F8FAFC",
        sidebar: "#FFFFFF",
        surface: "#FFFFFF",
        "surface-light": "#F1F5F9",
        "surface-dark": "#E2E8F0",
        muted: "#F8FAFC",
        border: "#E2E8F0",
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
        },
        accent: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
        },
        success: "#059669",
        warning: "#D97706",
        danger: "#DC2626",
        text: {
          primary: "#0F172A",
          muted: "#64748B",
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
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        md: "0 2px 4px -1px rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        lg: "0 4px 12px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.03)",
      },
    },
  },
  plugins: [],
};
export default config;
