/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f8fafc',
        secondary: '#94a3b8',
      },
      backgroundColor: {
        primary: '#0f172a',
        secondary: '#1e293b',
      }
    },
  },
  plugins: [],
}
