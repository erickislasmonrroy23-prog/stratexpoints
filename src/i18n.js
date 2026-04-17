import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Recursos inline — sin petición HTTP, carga instantánea, sin mensaje Locize
const es = {
  nav: {
    main: 'Principal', home: 'Command Center', strategic_center: 'Centro Estratégico',
    execution: 'Ejecución', strategy_map: 'Mapa Estratégico', okrs: 'OKRs', kpis: 'KPIs',
    initiatives: 'Iniciativas', intelligence: 'Inteligencia', ai_intel: 'Inteligencia IA',
    analytics: 'Analítica 360', operations: 'Operaciones', reports: 'Reportes', alerts: 'Alertas'
  },
  common: {
    save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar',
    create: 'Crear', add: 'Agregar', search: 'Buscar', loading: 'Cargando...',
    noData: 'Sin datos', confirm: 'Confirmar', back: 'Regresar', next: 'Siguiente',
    yes: 'Sí', no: 'No', status: 'Estado', actions: 'Acciones', name: 'Nombre', description: 'Descripción'
  },
  auth: {
    login: 'Iniciar Sesión', logout: 'Cerrar Sesión', loginTitle: 'Bienvenido de nuevo',
    loginSubtitle: 'Ingresa tus credenciales para acceder al sistema.',
    emailLabel: 'Correo Electrónico', passwordLabel: 'Contraseña',
    loginButton: 'Acceder a la Plataforma →', forgotPassword: '¿Olvidaste tu contraseña?',
    loginError: 'Error de acceso'
  },
  dashboard: {
    welcome: 'Bienvenido', executiveCommandCenter: 'Command Center Ejecutivo',
    activePeriod: 'Período Activo', globalHealthOKR: 'SALUD GLOBAL OKRS',
    monitoredKPIs: 'KPIs MONITOREADOS', alertStatus: 'ESTADO DE ALERTAS',
    strategicIdentity: 'Identidad Estratégica', mission: 'NUESTRA MISIÓN',
    vision: 'NUESTRA VISIÓN', values: 'NUESTROS VALORES'
  },
  okrs: {
    title: 'OKRs', subtitle: 'objetivos registrados', newOKR: '+ Nuevo OKR',
    objective: 'Objetivo', progress: 'Progreso', owner: 'Responsable', generateAI: 'Generar con IA',
    status: { onTrack: 'En Curso', atRisk: 'En Riesgo', behind: 'Atrasado', completed: 'Completado', not_started: 'Sin Iniciar' }
  },
  kpis: { title: 'KPIs', newKPI: '+ Nuevo KPI', target: 'Meta', unit: 'Unidad', current: 'Actual', frequency: 'Frecuencia', trend: 'Tendencia' },
  initiatives: { title: 'Iniciativas', newInitiative: '+ Nueva Iniciativa', phase: 'Fase', budget: 'Presupuesto', responsible: 'Responsable', startDate: 'Fecha Inicio', endDate: 'Fecha Fin' },
  ai: { title: 'Inteligencia IA', analyzing: 'Analizando con Gemini AI...', generateAnalysis: 'Generar Nuevo Análisis' },
  language: { es: 'Español', en: 'Inglés' }
};

const en = {
  nav: {
    main: 'Main', home: 'Command Center', strategic_center: 'Strategic Center',
    execution: 'Execution', strategy_map: 'Strategy Map', okrs: 'OKRs', kpis: 'KPIs',
    initiatives: 'Initiatives', intelligence: 'Intelligence', ai_intel: 'AI Intelligence',
    analytics: 'Analytics 360', operations: 'Operations', reports: 'Reports', alerts: 'Alerts'
  },
  common: {
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    create: 'Create', add: 'Add', search: 'Search', loading: 'Loading...',
    noData: 'No data', confirm: 'Confirm', back: 'Back', next: 'Next',
    yes: 'Yes', no: 'No', status: 'Status', actions: 'Actions', name: 'Name', description: 'Description'
  },
  auth: {
    login: 'Sign In', logout: 'Sign Out', loginTitle: 'Welcome back',
    loginSubtitle: 'Enter your credentials to access the system.',
    emailLabel: 'Email Address', passwordLabel: 'Password',
    loginButton: 'Access Platform →', forgotPassword: 'Forgot your password?',
    loginError: 'Login error'
  },
  dashboard: {
    welcome: 'Welcome', executiveCommandCenter: 'Executive Command Center',
    activePeriod: 'Active Period', globalHealthOKR: 'OKR GLOBAL HEALTH',
    monitoredKPIs: 'MONITORED KPIs', alertStatus: 'ALERT STATUS',
    strategicIdentity: 'Strategic Identity', mission: 'OUR MISSION',
    vision: 'OUR VISION', values: 'OUR VALUES'
  },
  okrs: {
    title: 'OKRs', subtitle: 'objectives registered', newOKR: '+ New OKR',
    objective: 'Objective', progress: 'Progress', owner: 'Owner', generateAI: 'Generate with AI',
    status: { onTrack: 'On Track', atRisk: 'At Risk', behind: 'Behind', completed: 'Completed', not_started: 'Not Started' }
  },
  kpis: { title: 'KPIs', newKPI: '+ New KPI', target: 'Target', unit: 'Unit', current: 'Current', frequency: 'Frequency', trend: 'Trend' },
  initiatives: { title: 'Initiatives', newInitiative: '+ New Initiative', phase: 'Phase', budget: 'Budget', responsible: 'Responsible', startDate: 'Start Date', endDate: 'End Date' },
  ai: { title: 'AI Intelligence', analyzing: 'Analyzing with Gemini AI...', generateAnalysis: 'Generate New Analysis' },
  language: { es: 'Spanish', en: 'English' }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'es-MX': { translation: es },
      'es':    { translation: es },
      'en-US': { translation: en },
      'en':    { translation: en },
    },
    lng: localStorage.getItem('xtratia-lang') || 'es-MX',
    fallbackLng: 'es-MX',
    supportedLngs: ['es-MX', 'es', 'en-US', 'en'],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
