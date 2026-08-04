/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-page': '#0B2240',
        'bg-card': '#132C4D',
        'bg-input': '#0F2545',
        'border-subtle': '#1D3B60',
        'accent-cyan': '#2EB9FE',
        'text-primary': '#FFFFFF',
        'text-secondary': '#7FA9CF',
        'text-muted': '#6089AF',
        'text-on-accent': '#0B2240',
        // Paleta vívida (doc 08, sección "Estados semánticos") — bg = color al 15%
        // de opacidad, text/bar = color sólido. El bar SIEMPRE coincide con el
        // estado real, nunca queda fijo en accent-cyan (ese era el bug de Fase 1).
        estado: {
          'al-dia-bg': 'rgba(0,230,138,0.15)',
          'al-dia-text': '#00E68A',
          'al-dia-bar': '#00E68A',
          'pendiente-bg': 'rgba(255,162,61,0.15)',
          'pendiente-text': '#FFA23D',
          'pendiente-bar': '#FFA23D',
          'deuda-bg': 'rgba(255,92,92,0.15)',
          'deuda-text': '#FF5C5C',
          'deuda-bar': '#FF5C5C',
          'error-text': '#FF5C5C',
        },
        // Fila fijada (doc 08, sección "Fijar filas") — wash del accent-cyan,
        // no un token de estado.
        'pin-row-bg': 'rgba(46,185,254,0.06)',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

