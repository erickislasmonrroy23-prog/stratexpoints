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

// Paleta tomada del logo oficial: azul pizarra (#394556) y gris plata del anillo (#AEB3BF)
export const PALETTE = {
  light: {
    '--bg': '#F1F3F6', '--bg2': '#FFFFFF', '--bg3': '#E6E9EE', '--border': '#D5DAE1',
    '--text': '#1F2733', '--text2': '#394556', '--text3': '#647083',
    '--primary': '#394556', '--primary-light': '#E4E8EE',
    '--accent': '#5E6B80', '--accent-light': '#ECEEF2',
    '--teal': '#3E6E78', '--teal-light': '#E2EEF0',
    '--gold': '#5E6B80', '--gold-light': '#ECEEF2',
    '--green': '#2F7D4F', '--green-light': '#E3F1E8',
    '--red': '#B3261E', '--red-light': '#F9E5E3',
    '--violet': '#5B4A8A', '--violet-light': '#ECE8F4',
  },
  dark: {
    '--bg': '#141A23', '--bg2': '#1B232E', '--bg3': '#232D3A', '--border': '#323D4C',
    '--text': '#E8EBF0', '--text2': '#C6CDD7', '--text3': '#929CAB',
    '--primary': '#B9C3D3', '--primary-light': '#2A3442',
    '--accent': '#AEB3BF', '--accent-light': '#2A3038',
    '--teal': '#7FB2B9', '--teal-light': '#173236',
    '--gold': '#AEB3BF', '--gold-light': '#2A3038',
    '--green': '#6BC08D', '--green-light': '#12301F',
    '--red': '#F08A80', '--red-light': '#3A1714',
    '--violet': '#A99BD6', '--violet-light': '#241F38',
  },
};
