/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(9 9 11 / <alpha-value>)',
        foreground: 'rgb(250 250 250 / <alpha-value>)',
        muted: 'rgb(39 39 42 / <alpha-value>)',
        'muted-foreground': 'rgb(161 161 170 / <alpha-value>)',
        border: 'rgb(39 39 42 / <alpha-value>)',
        primary: 'rgb(37 99 235 / <alpha-value>)',
        'primary-foreground': 'rgb(255 255 255 / <alpha-value>)',
        destructive: 'rgb(220 38 38 / <alpha-value>)',
        'destructive-foreground': 'rgb(255 255 255 / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
