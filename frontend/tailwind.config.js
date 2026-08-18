/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'rgba(25, 25, 30, 0.35)',
          border: 'rgba(255, 255, 255, 0.07)',
          accent: 'rgba(255, 255, 255, 0.15)',
          highlight: '#3b82f6', // Bright blue for message badges
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
