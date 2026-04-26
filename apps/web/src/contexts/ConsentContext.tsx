import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const CONSENT_KEY = 'newshub-consent';

export interface ConsentState {
  essential: boolean;      // Always true - required for app to function
  preferences: boolean;    // Theme, language, filters
  analytics: boolean;      // Reading history, usage tracking
}

interface ConsentContextType {
  consent: ConsentState | null;  // null = not yet decided
  hasDecided: boolean;
  acceptAll: () => void;
  acceptEssentialOnly: () => void;
  updateConsent: (consent: Partial<ConsentState>) => void;
  resetConsent: () => void;
}

const ConsentContext = createContext<ConsentContextType | null>(null);

const DEFAULT_CONSENT: ConsentState = {
  essential: true,
  preferences: false,
  analytics: false,
};

const FULL_CONSENT: ConsentState = {
  essential: true,
  preferences: true,
  analytics: true,
};

function loadConsent(): ConsentState | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure essential is always true
      return { ...parsed, essential: true };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveConsent(consent: ConsentState): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Ignore storage errors
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(() => loadConsent());

  const hasDecided = consent !== null;

  const acceptAll = useCallback(() => {
    setConsent(FULL_CONSENT);
    saveConsent(FULL_CONSENT);
  }, []);

  const acceptEssentialOnly = useCallback(() => {
    setConsent(DEFAULT_CONSENT);
    saveConsent(DEFAULT_CONSENT);
    // Clear non-essential storage when user declines
    clearNonEssentialStorage();
  }, []);

  const updateConsent = useCallback((updates: Partial<ConsentState>) => {
    setConsent((prev) => {
      const newConsent = { ...(prev ?? DEFAULT_CONSENT), ...updates, essential: true };
      saveConsent(newConsent);

      // Clear specific storage based on what was revoked
      if (!newConsent.preferences && prev?.preferences) {
        clearPreferencesStorage();
      }
      if (!newConsent.analytics && prev?.analytics) {
        clearAnalyticsStorage();
      }

      return newConsent;
    });
  }, []);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    setConsent(null);
  }, []);

  return (
    <ConsentContext.Provider
      value={{
        consent,
        hasDecided,
        acceptAll,
        acceptEssentialOnly,
        updateConsent,
        resetConsent,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextType {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within ConsentProvider');
  }
  return context;
}

/**
 * Check if a specific consent type is granted
 */
export function useHasConsent(type: keyof ConsentState): boolean {
  const { consent } = useConsent();
  return consent?.[type] ?? false;
}

// Storage cleanup functions
function clearNonEssentialStorage(): void {
  clearPreferencesStorage();
  clearAnalyticsStorage();
}

function clearPreferencesStorage(): void {
  // Remove preference-related storage
  const keysToRemove = [
    'newshub-storage',
    'newshub-filter-presets',
  ];
  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  });
}

function clearAnalyticsStorage(): void {
  // Remove analytics-related storage
  const keysToRemove = [
    'visitCount',
    'articlesRead',
    'installPromptDismissed',
  ];
  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  });

  // Clear AI chat history (pattern-based)
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('newshub-ai-chat')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore
  }
}
