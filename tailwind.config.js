/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sampled directly from the Hadia Mart logo.
        primary: {
          50: '#eafbf1',
          100: '#cef5dd',
          200: '#9de9bd',
          300: '#66d599',
          400: '#37b978',
          500: '#189c5f',
          600: '#0f7f4d',
          700: '#0d6440',
          800: '#0c4f35',
          900: '#0a3f2a',
          950: '#052318',
        },
        accent: {
          50: '#fff4ed',
          100: '#ffe4d2',
          200: '#ffc6a3',
          300: '#ffa06b',
          400: '#ff7a38',
          500: '#f4590c',
          600: '#e04600',
          700: '#b93900',
          800: '#942e04',
          900: '#792708',
        },
        leaf: {
          50: '#f6fbe8',
          100: '#e9f5c3',
          200: '#d3eb8c',
          300: '#b6da55',
          400: '#9ec52e',
          500: '#7ea310',
          600: '#628109',
          700: '#4b620c',
          800: '#3e4f0f',
          900: '#354310',
        },
      },
      fontFamily: {
        sans: ['"Hind Siliguri"', '"Poppins"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', '"Hind Siliguri"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(10, 63, 42, 0.08), 0 1px 3px -1px rgba(10, 63, 42, 0.06)',
        card: '0 4px 20px -4px rgba(10, 63, 42, 0.12)',
        popover: '0 12px 32px -8px rgba(10, 63, 42, 0.22)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0f7f4d 0%, #0c4f35 100%)',
        'accent-gradient': 'linear-gradient(135deg, #ff7a38 0%, #e04600 100%)',
        'hero-gradient': 'linear-gradient(120deg, #0a3f2a 0%, #0f7f4d 55%, #ff7a38 130%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
