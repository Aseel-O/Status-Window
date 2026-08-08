/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '.dark'],
  theme: {
    extend: {
      colors: {
        // Semantic, theme-aware tokens — see src/index.css for the light/dark
        // CSS variable definitions. Using these (instead of literal grays)
        // is what lets the whole app respond to the light/dark toggle.
        app: 'rgb(var(--c-app) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        soft: 'rgb(var(--c-panel-soft) / <alpha-value>)',
        input: 'rgb(var(--c-input) / <alpha-value>)',
        line: 'rgb(var(--c-border) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        'fg-secondary': 'rgb(var(--c-fg-secondary) / <alpha-value>)',
        'fg-muted': 'rgb(var(--c-fg-muted) / <alpha-value>)',
        gold: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          strong: 'rgb(var(--c-accent-strong) / <alpha-value>)',
          on: 'rgb(var(--c-accent-on) / <alpha-value>)',
        },
        success: 'rgb(var(--c-success) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        // Stat jewel tones stay constant across themes — they're the app's
        // identity colors, not surface chrome.
        stat: {
          intelligence: '#5B8DEF',
          wealth: '#E0A93E',
          creativity: '#B389F0',
          mentality: '#4FC3B0',
          religion: '#3FA66B',
          health: '#F0708A',
          strength: '#E15D4C',
          agility: '#A8D65C',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 0 0 1px rgb(var(--c-accent) / 0.15), 0 8px 24px -8px rgb(0 0 0 / var(--c-shadow-alpha, 0.6))',
      },
      keyframes: {
        fillbar: { '0%': { width: '0%' } },
        popin: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        fillbar: 'fillbar 0.8s cubic-bezier(0.22,1,0.36,1)',
        popin: 'popin 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
