/**
 * Critical i18n strings loaded synchronously (~1KB).
 * Used for loading states before i18n backend loads.
 *
 * DO NOT add external imports - this must load immediately.
 */

export const CRITICAL_I18N = {
  en: {
    loading: 'Loading...',
    retrying: 'Retrying...',
    failed: 'Failed to load. Tap to retry.',
    connectionIssue: 'Connection issue. Retrying...',
  },
  de: {
    loading: 'Laden...',
    retrying: 'Wird erneut versucht...',
    failed: 'Laden fehlgeschlagen. Tippen zum Wiederholen.',
    connectionIssue: 'Verbindungsproblem. Wird erneut versucht...',
  },
  fr: {
    loading: 'Chargement...',
    retrying: 'Nouvelle tentative...',
    failed: 'Echec du chargement. Appuyez pour reessayer.',
    connectionIssue: 'Probleme de connexion. Nouvelle tentative...',
  },
} as const;

export type CriticalLang = keyof typeof CRITICAL_I18N;

/**
 * Get a critical string for the given language and key.
 * Falls back to English if language is not supported.
 *
 * @param lang - Language code (en, de, fr, etc.)
 * @param key - String key (loading, retrying, failed, connectionIssue)
 */
export function getCriticalString(
  lang: string,
  key: keyof typeof CRITICAL_I18N.en
): string {
  const supportedLang = lang in CRITICAL_I18N ? (lang as CriticalLang) : 'en';
  return CRITICAL_I18N[supportedLang][key];
}
