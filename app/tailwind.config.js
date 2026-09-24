/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#06090e',
        surface: '#10141a',
        primary: '#ccff00',
        secondary: '#00f0ff',
        text: '#ffffff',
        muted: '#8b949e',
        danger: '#ff4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
