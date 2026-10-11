/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        scout: {
          primary: "#1b4332",
          secondary: "#2d6a4f",
          accent: "#52b788",
          gold: "#d4af37",
          dark: "#081c15",
          light: "#d8f3dc",
        }
      },
      fontFamily: {
        sans: ["Tajawal", "Cairo", "sans-serif"],
      }
    },
  },
  plugins: [],
}
