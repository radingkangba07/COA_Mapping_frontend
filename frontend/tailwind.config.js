/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './App.tsx'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        surface: 'var(--color-surface)',
        'surface-highlight': 'var(--color-surface-highlight)',
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        ring: 'var(--color-ring)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          foreground: 'var(--color-destructive-foreground)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          foreground: 'var(--color-success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          foreground: 'var(--color-warning-foreground)',
        },
        card: {
          DEFAULT: 'var(--color-card)',
          foreground: 'var(--color-card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--color-popover)',
          foreground: 'var(--color-popover-foreground)',
        },
        chip: {
          DEFAULT: 'var(--color-chip)',
          foreground: 'var(--color-chip-foreground)',
        },
        // Master-data-wizard semantic-state tint backgrounds. Fg colors for
        // these states reuse destructive/warning/accent/success/muted-foreground
        // above directly (see semanticClass() in src/config/theme.ts).
        'impact-blocker': 'var(--tint-impact-blocker)',
        'impact-review': 'var(--tint-impact-review)',
        'impact-warning': 'var(--tint-impact-warning)',
        'impact-clean': 'var(--tint-impact-clean)',
        'impact-resolved': 'var(--tint-impact-clean)',
        'find-dup': 'var(--tint-find-dup)',
        'find-warn': 'var(--tint-find-warn)',
        'find-info': 'var(--tint-find-info)',
        'find-ok': 'var(--tint-find-ok)',
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
