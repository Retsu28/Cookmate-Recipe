/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#22C55E",
        background: "#F9FAFB",
        dark: "#111827",
      },
    },
  },
  plugins: [],
}
