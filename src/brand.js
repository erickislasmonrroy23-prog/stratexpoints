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
    display: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Helvetica Neue', Arial, sans-serif",
    body: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Helvetica Neue', Arial, sans-serif",
  },
};

// Paleta estilo Apple (Human Interface Guidelines): grises neutros, un solo acento y colores de sistema.
export const PALETTE = {
  light: {
    '--bg': '#F5F5F7', '--bg2': '#FFFFFF', '--bg3': '#F2F2F7', '--border': '#E5E5EA',
    '--text': '#1D1D1F', '--text2': '#424245', '--text3': '#6E6E73',
    '--primary': '#0071E3', '--primary-light': '#E8F1FC',
    '--accent': '#0071E3', '--accent-light': '#E8F1FC',
    '--teal': '#0A84A5', '--teal-light': '#E3F3F7',
    '--gold': '#C93400', '--gold-light': '#FFF1E6',
    '--green': '#248A3D', '--green-light': '#E7F6EA',
    '--red': '#D70015', '--red-light': '#FDEBEC',
    '--violet': '#8944AB', '--violet-light': '#F4ECF8',
  },
  dark: {
    '--bg': '#000000', '--bg2': '#1C1C1E', '--bg3': '#2C2C2E', '--border': '#38383A',
    '--text': '#F5F5F7', '--text2': '#D1D1D6', '--text3': '#98989D',
    '--primary': '#0A84FF', '--primary-light': '#0A2A4D',
    '--accent': '#0A84FF', '--accent-light': '#0A2A4D',
    '--teal': '#64D2FF', '--teal-light': '#0C2B36',
    '--gold': '#FF9F0A', '--gold-light': '#3A2A0E',
    '--green': '#30D158', '--green-light': '#0F2E17',
    '--red': '#FF453A', '--red-light': '#3A1311',
    '--violet': '#BF5AF2', '--violet-light': '#2D1838',
  },
};
