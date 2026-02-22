/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        kalshi: {
          bg: "#0B1120",
          card: "#1E293B",
          accent: "#6366F1",
          border: "#334155",
        },
      },
    },
  },
  plugins: [],
};
