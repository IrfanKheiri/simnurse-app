/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          50: '#f0f9fa',
          100: '#dcf1f2',
          200: '#bee2e6',
          300: '#93ccd3',
          400: '#60aeb9',
          500: '#43919e',
          600: '#3a7784',
          700: '#35626d',
          800: '#32525b',
          900: '#2d464f',
          950: '#1a2e35',
        },
        vital: {
          hr: '#ff4b4b',
          spo2: '#00e5ff',
          bp: '#ffca28',
          rr: '#4ade80',
          temp: '#fb923c',
        }
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.1), 0 4px 10px -5px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      }
    },
  },
  plugins: [],
}

