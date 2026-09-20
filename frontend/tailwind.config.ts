import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f4f4f5',
          tertiary: '#fafafa',
          dark: '#27272a',
          'dark-secondary': '#1f1f23',
          'dark-tertiary': '#18181b',
        },
        border: {
          DEFAULT: '#e4e4e7',
          dark: '#3f3f46',
          'dark-strong': '#52525b',
        },
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.04)',
        sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        md: '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.04)',
        'dark-sm': '0 1px 3px rgba(0,0,0,0.2)',
        'dark-md': '0 4px 6px -1px rgba(0,0,0,0.3)',
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} satisfies Config
