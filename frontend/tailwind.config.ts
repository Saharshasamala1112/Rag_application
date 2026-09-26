import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Application background
        app: {
          DEFAULT: '#F8F7F4', // warm off-white light
          dark: '#0A0A0A', // near-black dark
        },
        // Surface (cards, panels)
        surface: {
          DEFAULT: '#FFFFFF', // white light
          secondary: '#F5F5F4', // stone-100 light
          elevated: '#FAFAF9', // stone-50 light
          dark: '#111111', // dark surface
          'dark-elevated': '#181818', // dark elevated
          'dark-hover': '#1F1F1F', // dark hover
        },
        // Borders
        edge: {
          DEFAULT: '#E7E5E4', // stone-200 light
          strong: '#D6D3D1', // stone-300 light
          dark: '#262626', // dark border
          'dark-strong': '#333333', // dark strong border
        },
        // Text
        fg: {
          DEFAULT: '#1C1917', // stone-900 light
          secondary: '#78716C', // stone-500 light
          tertiary: '#6B6560', // accessible warm gray on light surfaces
          muted: '#6B6560',
          dark: '#F5F5F5', // light text dark
          'dark-secondary': '#A1A1AA', // zinc-400 dark
          'dark-tertiary': '#8B8B95', // accessible zinc on dark surfaces
        },
        // Accent — restrained teal/slate
        accent: {
          DEFAULT: '#0F766E', // teal-700
          hover: '#115E59', // teal-800
          subtle: '#F0FDFA', // teal-50
          dark: '#2DD4BF', // teal-400 dark
          'dark-hover': '#5EEAD4', // teal-300 dark
          'dark-subtle': '#042F2E', // teal-950 dark
        },
        // Status
        danger: {
          DEFAULT: '#DC2626',
          hover: '#B91C1C',
          subtle: '#FEF2F2',
          dark: '#F87171',
          'dark-subtle': '#450A0A',
        },
        success: {
          DEFAULT: '#16A34A',
          subtle: '#F0FDF4',
          dark: '#4ADE80',
          'dark-subtle': '#052E16',
        },
        warning: {
          DEFAULT: '#D97706',
          subtle: '#FFFBEB',
          dark: '#FBBF24',
          'dark-subtle': '#451A03',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.03)',
        sm: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        md: '0 4px 6px -1px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.03)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -4px rgba(0,0,0,0.03)',
        panel: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.02)',
        'dark-sm': '0 1px 3px rgba(0,0,0,0.3)',
        'dark-md': '0 4px 6px -1px rgba(0,0,0,0.4)',
        'dark-lg': '0 10px 15px -3px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
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
  plugins: [typography],
} satisfies Config
