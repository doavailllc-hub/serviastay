/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#ff385c',       /* The exact primary booking CTA color */
          pinkHover: '#e61e4d',  /* Darker interactive hover states */
          dark: '#222222',       /* Premium body text gray */
          lightGray: '#717171',  /* Subtle secondary description labels */
          border: '#dddddd'      /* Minimalist panel divider lines */
        }
      },
      fontFamily: {
        sans: [
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Segoe UI"', 
          'Roboto', 
          'Helvetica', 
          'Arial', 
          'sans-serif'
        ],
      }
    },
  },
  plugins: [],
}