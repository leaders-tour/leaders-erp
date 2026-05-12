import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        accommodationDestinationReveal: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accommodation-destination-reveal':
          'accommodationDestinationReveal 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      maxWidth: {
        '8xl': '96rem',
      },
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
