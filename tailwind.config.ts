import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF8F3",
        ink: "#1A1A1A",
        blush: { DEFAULT: "#F9C6D6", deep: "#F4A6BF" },
        sky: { soft: "#BFE3EE" },
        sage: { DEFAULT: "#B5CE8A" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        floaty: { "0%,100%": { transform: "translateY(0) rotate(-4deg)" }, "50%": { transform: "translateY(-8px) rotate(4deg)" } },
        dots: { "0%,80%,100%": { opacity: "0.2" }, "40%": { opacity: "1" } },
      },
      animation: { marquee: "marquee 28s linear infinite", floaty: "floaty 4s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
