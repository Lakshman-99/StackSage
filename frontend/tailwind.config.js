/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./stores/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"General Sans"', "system-ui", "sans-serif"],
        display: ['"Fraunces"', "system-ui", "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        ink: {
          50: "#FAF9F6",
          100: "#F1EFEA",
          200: "#E2DFD7",
          300: "#C9C4B8",
          400: "#9C9689",
          500: "#78725F",
          600: "#57513F",
          700: "#3C3830",
          800: "#282520",
          900: "#1A1814",
          950: "#100F0C",
        },
        accent: {
          DEFAULT: "#10b981",
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
      },
      borderRadius: {
        "2xl": "0.75rem",
        "3xl": "1rem",
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out both",
        "shimmer": "shimmer 2.5s ease-in-out infinite",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%, 100%": { backgroundPosition: "-200% 0" },
          "50%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};