/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#121212',
        fg: '#FFFFFF',
        accent: '#96FF1A',
      },
    },
  },
  plugins: [],
};
