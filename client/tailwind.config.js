/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          50: '#EDF1F4',
          100: '#DDE5EA',
          200: '#C4D0D8',
          300: '#A4B3BF',
          400: '#7F909E',
          500: '#627280',
          600: '#46535F',
          700: '#2B3742',
          800: '#1B2430',
          900: '#11161D'
        },
        institute: {
          500: '#4E7F93',
          600: '#3D697A'
        },
        caution: {
          500: '#B58A4A',
          600: '#9A733A'
        },
        critical: {
          500: '#8A3A3A',
          600: '#6E2D2D'
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        panel: '0 18px 48px rgba(0, 0, 0, 0.28)',
        insetSoft: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)'
      },
      backgroundImage: {
        'dashboard-grid': 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)'
      },
      animation: {
        'fade-up': 'fadeUp 360ms ease-out both',
        'pulse-soft': 'pulseSoft 2.8s ease-in-out infinite'
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.88' },
          '50%': { opacity: '1' }
        }
      }
    }
  },
  plugins: []
}