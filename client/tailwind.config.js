/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm ivory / off-white surfaces
        ivory: {
          50: '#fdfcf9',
          100: '#fbf9f5', // primary page canvas
          150: '#f7f4ee',
          200: '#f2ece2', // subtle surface panel
          300: '#e8e1d3', // border standard
          400: '#dcd3c3',
          500: '#c2b6a3',
        },
        // Deep charcoal typography
        charcoal: {
          950: '#121110',
          900: '#1c1917', // primary heading and text
          800: '#292524', // secondary text
          700: '#44403c', // medium labels
          600: '#57534e', // muted text
          500: '#78716c', // placeholders and meta
          400: '#a8a29e',
        },
        // Restrained Sage Green (completion, active work, success)
        sage: {
          50: '#f4f7f4',
          100: '#e6ede7',
          200: '#cedece',
          300: '#a8c2ab',
          500: '#4d6b53',
          600: '#3d5642',
          700: '#304434',
          800: '#243327',
        },
        // Muted Terracotta (alerts, deadlines, budget warnings)
        terracotta: {
          50: '#fdf6f4',
          100: '#faeae5',
          200: '#f5d3ca',
          300: '#eab4a5',
          500: '#c05638',
          600: '#a74328',
          700: '#86341f',
          800: '#6a2a19',
        },
        // Subtle Amber (in-progress, pending, stopwatch)
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(28, 25, 23, 0.05), 0 1px 2px rgba(28, 25, 23, 0.03)',
        'elevated': '0 4px 16px -2px rgba(28, 25, 23, 0.07), 0 2px 6px -1px rgba(28, 25, 23, 0.04)',
        'dropdown': '0 10px 30px -4px rgba(28, 25, 23, 0.12), 0 4px 8px -2px rgba(28, 25, 23, 0.04)',
      },
    },
  },
  plugins: [],
}

