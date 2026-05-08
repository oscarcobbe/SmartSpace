import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef4eb",
          100: "#fde5d0",
          200: "#facba1",
          300: "#f8b172",
          400: "#f69743",
          500: "#f48222",
          600: "#d96d15",
          // 700 (#b55810) gives 4.81:1 contrast on white. Use for any
          // orange text/links/small button text. 500 stays decorative.
          700: "#b55810",
          800: "#91440c",
          900: "#6d3009",
        },
        // Ink (text). Values defined as CSS variables in globals.css.
        // Use `text-ink-1` for headlines, `text-ink-2` for body, etc.
        ink: {
          1: "var(--ink-1)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
          "on-dark": "var(--ink-on-dark)",
        },
        // Surface (background). Cream-tinted neutrals + dark variant.
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          dark: "var(--surface-dark)",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        display: ["Fraunces", "Manrope", "system-ui", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
