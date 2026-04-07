import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi) // Carga traducciones desde una URL
  .use(initReactI18next)
  .init({ 
  showSupportNotice: false, // Desactiva el mensaje de soporte de Locize
  lng: 'es-MX', // Idioma de seguridad por defecto
  fallbackLng: 'en-US',
  interpolation: { escapeValue: false },
  backend: {
    // Ruta a tus archivos de traducción en la carpeta `public`
    loadPath: '/locales/{{lng}}/{{ns}}.json',
  },
  react: {
    // Envuelve tu App en <Suspense> para mostrar un loader mientras carga el idioma
    useSuspense: true, 
  }
});

export default i18n;