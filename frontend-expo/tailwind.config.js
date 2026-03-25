/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './App.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        foreground: '#09090B',
        surface: '#F4F4F5',
        'surface-highlight': '#FAFAFA',
        border: '#E4E4E7',
        input: '#E4E4E7',
        ring: '#2563EB',
        primary: {
          DEFAULT: '#18181B',
          foreground: '#FAFAFA',
        },
        secondary: {
          DEFAULT: '#F4F4F5',
          foreground: '#18181B',
        },
        accent: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F4F4F5',
          foreground: '#6B6B73',
        },
        destructive: {
          DEFAULT: '#D72222',
          foreground: '#FAFAFA',
        },
        success: {
          DEFAULT: '#15803D',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#B45309',
          foreground: '#FFFFFF',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#09090B',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#09090B',
        },
      },
      fontFamily: {
        heading: ['Chivo'],
        body: ['Inter'],
        mono: ['JetBrainsMono'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      spacing: {
        'section-gap': '3rem',
        'component-gap': '1.5rem',
        'internal-padding': '1.5rem',
      },
    },
  },
  plugins: [],
};
