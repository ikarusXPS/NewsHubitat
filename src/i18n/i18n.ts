import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ICU from 'i18next-icu';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { useAppStore } from '../store';

i18n
  .use(ICU)                    // ICU MessageFormat per D-09
  .use(Backend)                // Lazy load from /public/locales per D-02
  .use(LanguageDetector)       // Auto-detect browser language per I18N-03
  .use(initReactI18next)       // React bindings
  .init({
    fallbackLng: 'en',         // D-08: English fallback
    supportedLngs: ['de', 'en'],
    ns: ['common'],            // Default namespace
    defaultNS: 'common',

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'newshub-language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,      // React handles XSS
    },

    react: {
      useSuspense: true,       // Enable Suspense for loading
    },
  });

// Sync i18next language changes to Zustand store (per RESEARCH.md Pattern 3)
i18n.on('languageChanged', (lng: string) => {
  const validLng = lng === 'de' || lng === 'en' ? lng : 'en';
  const setLanguage = useAppStore.getState().setLanguage;
  setLanguage(validLng);
});

export default i18n;
