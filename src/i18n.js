import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(initReactI18next)
  .init({
    lng: localStorage.getItem('xtratia-lang') || 'es-MX',
    fallbackLng: 'es-MX',
    supportedLngs: ['es-MX', 'es', 'en-US', 'en'],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
