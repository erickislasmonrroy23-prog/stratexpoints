// Identidad corporativa — Cabrera & Consultores en Estrategia y Riesgos
// Fuente única de nombre, logo y paleta. Cambia aquí y se refleja en toda la app.
export const BRAND = {
  name: 'Cabrera & Consultores',
  legalName: 'Cabrera & Consultores en Estrategia y Riesgos',
  shortName: 'C&C',
  product: 'Sistema de Gestión Estratégica',
  tagline: 'Estrategia, control y riesgo en un solo tablero.',
  // Coloca el logo oficial en /public/brand/logo-cyc.png (si no existe, se muestra el monograma)
  logo: '/brand/logo-cyc.png',
  fonts: {
    display: "'Marcellus', 'Hoefler Text', Georgia, serif",
    body: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  },
};

export const PALETTE = {
  light: {
    '--bg': '#EEF1F3', '--bg2': '#FFFFFF', '--bg3': '#E4E9ED', '--border': '#D3DBE1',
    '--text': '#0A2029', '--text2': '#284450', '--text3': '#56707E',
    '--primary': '#12404F', '--primary-light': '#E1EAEE',
    '--accent': '#8E6321', '--accent-light': '#F3ECE1',
    '--teal': '#2E6F74', '--teal-light': '#E2EFEF',
    '--gold': '#8E6321', '--gold-light': '#F3ECE1',
    '--green': '#2F7D4F', '--green-light': '#E3F1E8',
    '--red': '#B3261E', '--red-light': '#F9E5E3',
    '--violet': '#5B4A8A', '--violet-light': '#ECE8F4',
  },
  dark: {
    '--bg': '#071A22', '--bg2': '#0C242E', '--bg3': '#12303C', '--border': '#1F3D4A',
    '--text': '#E6EDF1', '--text2': '#C4D3DB', '--text3': '#8FA6B3',
    '--primary': '#D9AC6B', '--primary-light': '#2A2A22',
    '--accent': '#D9AC6B', '--accent-light': '#2A2A22',
    '--teal': '#6FB3B5', '--teal-light': '#123236',
    '--gold': '#D9AC6B', '--gold-light': '#2A2A22',
    '--green': '#6BC08D', '--green-light': '#12301F',
    '--red': '#F08A80', '--red-light': '#3A1714',
    '--violet': '#A99BD6', '--violet-light': '#241F38',
  },
};
