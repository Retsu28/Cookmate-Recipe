/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#f97316",
        background: "#faf9f5",
        dark: "#1c1917",
        muted: "#a8a29e",
        border: "#eeeae4",
        surface: "#fffefa",
      },
    },
  },
  plugins: [],
}
