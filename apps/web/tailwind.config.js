export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark theme surfaces
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        buy: '#26A69A',
        sell: '#EF5350',
        accent: '#387ED1',
      },
      fontFamily: {
        mono: ['DM Mono', 'monospace'],
        sans: ['DM Sans', 'system-ui'],
      }
    }
  }
}