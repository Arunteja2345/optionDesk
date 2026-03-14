export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a1a',
        'surface-2': '#242424',
        'surface-3': '#2a2a2a',
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