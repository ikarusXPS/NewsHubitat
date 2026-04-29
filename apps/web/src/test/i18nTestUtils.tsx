/**
 * i18n test utilities for components using translations
 */
/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Create isolated test i18n instance (does not affect production i18n)
const testI18n = i18n.createInstance();

testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['de', 'en'],
  resources: {
    en: {
      common: {
        'buttons.save': 'Save',
        'buttons.cancel': 'Cancel',
        'buttons.delete': 'Delete',
        'buttons.confirm': 'Confirm',
        'errors.generic': 'Something went wrong',
        'errors.network': 'Network error. Please try again.',
      },
    },
    de: {
      common: {
        'buttons.save': 'Speichern',
        'buttons.cancel': 'Abbrechen',
        'buttons.delete': 'Loschen',
        'buttons.confirm': 'Bestatigen',
        'errors.generic': 'Etwas ist schiefgelaufen',
        'errors.network': 'Netzwerkfehler. Bitte erneut versuchen.',
      },
    },
  },
  interpolation: {
    escapeValue: false, // React escapes by default
  },
  react: {
    useSuspense: false, // Disable suspense in tests to avoid act() warnings
  },
});

/**
 * Provider wrapper for testing components that use useTranslation
 */
export function TestI18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>;
}

/**
 * Change test language for assertions
 */
export function setTestLanguage(lng: 'de' | 'en') {
  testI18n.changeLanguage(lng);
}

export { testI18n };
