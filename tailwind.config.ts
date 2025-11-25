import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Black and metallic base
        'deep-black': '#0a0a0a',
        'charcoal': '#1a1a1a',
        'silver': {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#8b95a1',
          600: '#6c757d',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        },
        // Accent colors
        'slate-blue': '#334155',
        'warm-brown': '#b68a71',
        'cream': '#f7f2d3',
        // Metallic effects
        'metallic': {
          light: '#e8e8e8',
          DEFAULT: '#c0c0c0',
          dark: '#8a8a8a',
        }
      },
      backgroundImage: {
        'metallic-gradient': 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 50%, #8a8a8a 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)',
        'accent-gradient': 'linear-gradient(135deg, #334155 0%, #475569 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(203, 213, 225, 0.15)',
        'glow-lg': '0 0 40px rgba(203, 213, 225, 0.25)',
        'metallic': '0 4px 20px rgba(192, 192, 192, 0.1)',
        'inner-glow': 'inset 0 0 20px rgba(203, 213, 225, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(203, 213, 225, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(203, 213, 225, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
