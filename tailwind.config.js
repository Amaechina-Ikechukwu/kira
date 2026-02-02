/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx}",
    "./src/client/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Dark gamer aesthetic - neon purples and blues
        primary: '#ec4899', // Pink as primary accent
        'neon': {
          purple: '#a855f7',
          'purple-bright': '#c084fc',
          'purple-dark': '#7c3aed',
          blue: '#3b82f6',
          'blue-bright': '#60a5fa',
          'blue-dark': '#2563eb',
          cyan: '#06b6d4',
          pink: '#ec4899',
        },
        'dark': {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#252533',
          500: '#32324a',
        }
      },
      fontFamily: {
        'game': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
        'neon-glow': '0 0 30px rgba(168, 85, 247, 0.4), 0 0 60px rgba(59, 130, 246, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)' },
          '100%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-game': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a25 50%, #12121a 100%)',
      }
    },
  },
  plugins: [],
}
