/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0fdf9',
          100: '#ccfbee',
          200: '#99f6dd',
          300: '#5bedc6',
          400: '#2dd4aa',
          500: '#0fb98e',
          600: '#059474',
          700: '#06785f',
          800: '#085f4d',
          900: '#094e40',
          950: '#042d25',
        },
        surface: {
          950: '#080c10',
          900: '#0d1117',
          850: '#111827',
          800: '#161d2b',
          750: '#1c2535',
          700: '#232d3f',
          600: '#2d3a50',
          500: '#3d4f6a',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
