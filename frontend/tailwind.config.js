/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        fitverse: {
          bg: '#0F1C1E',
          card: '#1A2E31',
          card2: '#1E3538',
          teal: '#00897B',
          accent: '#26C6DA',
          muted: '#4A6B70',
          text: '#E8F4F5',
          subtle: '#8AACB0',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
