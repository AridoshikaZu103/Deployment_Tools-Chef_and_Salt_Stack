/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#05070d',
          900: '#070b14',
          850: '#0b101d',
          800: '#0f1627',
          750: '#141d33',
          700: '#1a2540',
        },
        chef: {
          DEFAULT: '#f97316',
          dark: '#c2410c',
          light: '#fed7aa',
          glow: 'rgba(249, 115, 22, 0.25)',
        },
        salt: {
          DEFAULT: '#06b6d4',
          dark: '#0e7490',
          light: '#a5f3fc',
          glow: 'rgba(6, 182, 212, 0.25)',
        },
        hybrid: {
          DEFAULT: '#8b5cf6',
          dark: '#6d28d9',
          light: '#ddd6fe',
          glow: 'rgba(139, 92, 246, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-chef': '0 0 25px -4px rgba(249, 115, 22, 0.25)',
        'glow-salt': '0 0 25px -4px rgba(6, 182, 212, 0.25)',
        'glow-hybrid': '0 0 25px -4px rgba(139, 92, 246, 0.25)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
      }
    },
  },
  plugins: [],
}
