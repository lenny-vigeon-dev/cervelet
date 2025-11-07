import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx,mdx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          background: "var(--color-canvas-bg)",
          surface: "var(--color-surface)",
          border: "var(--color-border)",
          foreground: "var(--color-foreground)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        surface:
          "0 20px 65px rgba(0, 0, 0, 0.55), 0 0 45px rgba(255, 163, 33, 0.12)",
        brand: "0 20px 35px rgba(255, 163, 33, 0.45)",
      },
    },
  },
};

export default config;
