/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          50: '#F4F5F6',
          100: '#E7E9EC',
          200: '#D5D9DE',
          300: '#BBC1C9',
          400: '#8E97A3',
          500: '#6F7783',
          600: '#4E5663',
          700: '#2C323C',
          800: '#1B1F27',
          900: '#12151A'
        },
        institute: {
          500: '#3E6E8E',
          600: '#345B77'
        },
        caution: {
          500: '#B98A3D'
        },
        critical: {
          500: '#8C2F2F',
          600: '#6E2424'
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