/** @type {import('tailwindcss').Config} */
module.exports = {
  // ✅ Required for NativeWind v4
  presets: [require('nativewind/preset')],
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fef7ee',
          100: '#fdead3',
          200: '#fbd2a5',
          300: '#f8b36d',
          400: '#f48a32',
          500: '#f16a0a',
          600: '#e25305',
          700: '#bb3e08',
          800: '#95310e',
          900: '#782a0f',
        },
        secondary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          50:  '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        // Dark mode surface colors
        dark: {
          bg:       '#0f172a',
          surface:  '#1e293b',
          border:   '#334155',
          text:     '#f1f5f9',
          muted:    '#94a3b8',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'sans-serif'],
        serif: ['PlayfairDisplay', 'serif'],
      },
    },
  },
  plugins: [],
};
