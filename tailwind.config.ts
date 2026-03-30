import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f0ff',
          100: '#e4e4ff',
          200: '#c8c7ff',
          300: '#a9a6ff',
          400: '#8b83ff',
          500: '#7c6ffa',
          600: '#6d56f0',
          700: '#5b42d6',
          800: '#4a37ad',
          900: '#3d3090',
        },
        surface: {
          900: '#0d0e14',
          800: '#12141c',
          700: '#191c27',
          600: '#1e2231',
          500: '#252a3a',
          400: '#2e3347',
          300: '#3a4057',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7c6ffa 0%, #4f46e5 50%, #06b6d4 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(124,111,250,0.1) 0%, rgba(79,70,229,0.05) 100%)',
      },
      boxShadow: {
        'glow-purple': '0 0 24px rgba(124, 111, 250, 0.25)',
        'glow-green':  '0 0 24px rgba(34, 197, 94, 0.2)',
        'glow-red':    '0 0 24px rgba(239, 68, 68, 0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
export default config
