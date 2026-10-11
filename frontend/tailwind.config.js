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
        sefein: {
          gold: "#d4a338",
          "gold-light": "#f3c651",
          "gold-dark": "#a3771e",
          red: "#b91c1c",
          "red-light": "#dc2626",
          "red-dark": "#7f1d1d",
          green: "#1b4d3e",
          "green-light": "#2d7a58",
          dark: "#0b0c10",
          surface: "#14161e",
          card: "#191d26",
          border: "#282d3c",
          parchment: "#fcf6e8",
        }
      },
      fontFamily: {
        sans: ["Cairo", "Tajawal", "sans-serif"],
      }
    },
  },
  plugins: [],
}
