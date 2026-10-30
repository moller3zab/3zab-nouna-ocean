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
        surface: {
          DEFAULT: '#DDF5FF',
          dim: '#c9e9f4',
          bright: '#DDF5FF',
          lowest: '#ffffff',
          low: '#eefaff',
          container: '#d2eff8',
          high: '#c6e8f4',
          highest: '#b8e4f5',
          dark: '#081e2a',
          'dark-container': '#102e3d',
          'dark-high': '#173e50',
          'dark-card': '#103343',
        },
        primary: {
          DEFAULT: '#163242',
          container: '#1c667c',
          light: '#8ccde6',
          fixed: '#b8e4f5',
        },
        secondary: {
          DEFAULT: '#1c667c',
          container: '#b8e4f5',
          light: '#74b5bb',
        },
        tertiary: {
          DEFAULT: '#735c00',
          gold: '#d4af37',
          light: '#e9c349',
        },
        ink: {
          DEFAULT: '#24485c',
          muted: '#3b6980',
          subtle: '#5c8a9e',
          dark: '#e9f8ff',
          'dark-muted': '#a5cedd',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(36, 72, 92, 0.05), 0 2px 6px -1px rgba(45, 36, 38, 0.03)',
        'elevated': '0 12px 32px -4px rgba(36, 72, 92, 0.09), 0 4px 12px -2px rgba(45, 36, 38, 0.04)',
        'glow': '0 0 25px rgba(232, 138, 153, 0.25)',
        'dark-glow': '0 0 30px rgba(36, 72, 92, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
