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
          700: "#b55810",
          800: "#91440c",
          900: "#6d3009",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
