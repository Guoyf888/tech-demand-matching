/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1677FF',
          hover: '#0958D9',
          light: '#E6F4FF',
          50: '#E6F4FF',
          500: '#1677FF',
          600: '#0958D9',
          700: '#003EB3',
        },
        secondary: {
          bg: '#E6F4FF',
          surface: '#F5F5F5',
        },
        text: {
          title: '#333333',
          body: '#666666',
          hint: '#999999',
        },
      },
      borderRadius: {
        'card': '8px',
      },
      spacing: {
        'card-gap': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'btn-press': 'btnPress 0.1s ease-out',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        btnPress: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
