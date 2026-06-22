/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Soft pastel palette
        cream: '#faf7fb',
        ink: '#2f2a3a',
        muted: '#8b8597',
        lavender: '#cdb4f6',
        lilac: '#e7dcff',
        mint: '#bfe9d6',
        sky: '#bcdcff',
        peach: '#ffd6c9',
        butter: '#ffe9b3',
        rose: '#ffc6dd',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgba(120, 100, 160, 0.25)',
        card: '0 2px 18px -8px rgba(120, 100, 160, 0.22)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        },
        'ring-glow': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '30%': { opacity: '0.85', transform: 'scale(1.05)' },
          '100%': { opacity: '0', transform: 'scale(1.2)' },
        },
        'float-up': {
          '0%': { opacity: '0', transform: 'translate(-50%, 4px) scale(0.9)' },
          '15%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translate(-50%, -30px) scale(1.05)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'pop': 'pop 0.2s ease-out both',
        'ring-glow': 'ring-glow 0.7s ease-out',
        'float-up': 'float-up 1.1s ease-out forwards',
      },
    },
  },
  plugins: [],
}
