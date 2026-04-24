/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#f97316",
        background: "#fafaf9",
        dark: "#1c1917",
        muted: "#a8a29e",
        border: "#e7e5e4",
      },
    },
  },
  plugins: [],
}
