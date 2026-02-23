import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f5f2ec",
        panel: "#ffffff",
        elevated: "#f0ede6",
        hover: "#ede9e1",
        green: "#15803d",
        "green-mid": "#16a34a",
        "green-bright": "#22c55e",
        amber: "#d97706",
        red: "#dc2626",
        blue: "#2563eb",
      },
      fontFamily: {
        display: ['"Bebas Neue"', "cursive"],
        body: ['"Outfit"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
