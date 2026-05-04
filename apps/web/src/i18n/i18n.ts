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
    supportedLngs: ['de', 'en', 'fr'],
    ns: ['common', 'share', 'teams', 'pricing', 'factcheck', 'credibility', 'videos'],   // + factcheck + credibility (Phase 38); + videos (Phase 40-05)
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

// Sync i18next -> Zustand when language changes via i18n.changeLanguage()
i18n.on('languageChanged', (lng: string) => {
  const validLng = lng === 'de' || lng === 'en' || lng === 'fr' ? lng : 'en';
  const currentStoreLang = useAppStore.getState().language;
  // Only update if different to avoid loops
  if (currentStoreLang !== validLng) {
    useAppStore.getState().setLanguage(validLng);
  }
});

// Sync Zustand -> i18next when store language changes (e.g., from persisted state)
// This runs after hydration when Zustand loads from localStorage
let previousLanguage = useAppStore.getState().language;
useAppStore.subscribe((state) => {
  const language = state.language;
  // Only change if different to avoid loops
  if (language !== previousLanguage && (language === 'de' || language === 'en' || language === 'fr')) {
    previousLanguage = language;
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }
});

// Initial sync: if Zustand has a persisted language, apply it to i18next
// This handles the case where i18next detector hasn't run yet
const initialLanguage = useAppStore.getState().language;
if (initialLanguage && initialLanguage !== i18n.language) {
  i18n.changeLanguage(initialLanguage);
}

export default i18n;
