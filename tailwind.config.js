/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Themes are applied in JS (lib/theme-context); 'media' makes NativeWind fight the app on web
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};