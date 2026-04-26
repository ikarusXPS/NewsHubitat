import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Settings, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useConsent, type ConsentState } from '../contexts/ConsentContext';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';

const content = {
  de: {
    title: 'Datenschutz-Einstellungen',
    description: 'Wir nutzen lokalen Speicher (localStorage) für Einstellungen und Funktionen. Ihre Daten verlassen Ihr Gerät nicht.',
    acceptAll: 'Alle akzeptieren',
    essentialOnly: 'Nur notwendige',
    customize: 'Anpassen',
    save: 'Auswahl speichern',
    moreInfo: 'Mehr erfahren',
    categories: {
      essential: {
        title: 'Notwendig',
        description: 'Erforderlich für Login und grundlegende Funktionen. Kann nicht deaktiviert werden.',
      },
      preferences: {
        title: 'Einstellungen',
        description: 'Speichert Theme, Sprache, Filter und Bookmarks lokal in Ihrem Browser.',
      },
      analytics: {
        title: 'Nutzungsdaten',
        description: 'Speichert Lesehistorie und AI-Chat-Verlauf lokal. Keine Daten werden an Server gesendet.',
      },
    },
  },
  en: {
    title: 'Privacy Settings',
    description: 'We use local storage for settings and features. Your data stays on your device.',
    acceptAll: 'Accept all',
    essentialOnly: 'Essential only',
    customize: 'Customize',
    save: 'Save preferences',
    moreInfo: 'Learn more',
    categories: {
      essential: {
        title: 'Essential',
        description: 'Required for login and basic functionality. Cannot be disabled.',
      },
      preferences: {
        title: 'Preferences',
        description: 'Stores theme, language, filters, and bookmarks locally in your browser.',
      },
      analytics: {
        title: 'Usage Data',
        description: 'Stores reading history and AI chat locally. No data is sent to servers.',
      },
    },
  },
};

export function ConsentBanner() {
  const { hasDecided, acceptAll, acceptEssentialOnly, updateConsent } = useConsent();
  const { language } = useAppStore();
  const t = content[language];

  const [showDetails, setShowDetails] = useState(false);
  const [customConsent, setCustomConsent] = useState<ConsentState>({
    essential: true,
    preferences: true,
    analytics: true,
  });

  // Don't show if user has already decided
  if (hasDecided) {
    return null;
  }

  const handleSaveCustom = () => {
    updateConsent(customConsent);
  };

  const toggleCategory = (category: keyof Omit<ConsentState, 'essential'>) => {
    setCustomConsent((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6"
      >
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl bg-[rgba(0,10,20,0.95)] border border-[rgba(0,240,255,0.2)] shadow-2xl shadow-[#00f0ff]/10 backdrop-blur-xl">
            {/* Header */}
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                  <Shield className="h-5 w-5 text-[#00f0ff]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white font-mono">
                    {t.title}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {t.description}{' '}
                    <Link to="/privacy" className="text-[#00f0ff] hover:underline">
                      {t.moreInfo}
                    </Link>
                  </p>
                </div>
              </div>

              {/* Expandable Details */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
                      {/* Essential - Always on */}
                      <ConsentCategory
                        title={t.categories.essential.title}
                        description={t.categories.essential.description}
                        checked={true}
                        disabled={true}
                        onChange={() => {}}
                      />

                      {/* Preferences */}
                      <ConsentCategory
                        title={t.categories.preferences.title}
                        description={t.categories.preferences.description}
                        checked={customConsent.preferences}
                        onChange={() => toggleCategory('preferences')}
                      />

                      {/* Analytics */}
                      <ConsentCategory
                        title={t.categories.analytics.title}
                        description={t.categories.analytics.description}
                        checked={customConsent.analytics}
                        onChange={() => toggleCategory('analytics')}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                {showDetails ? (
                  <>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors text-sm font-medium"
                    >
                      <ChevronUp className="h-4 w-4 inline mr-1" />
                      {language === 'de' ? 'Weniger' : 'Less'}
                    </button>
                    <button
                      onClick={handleSaveCustom}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-[#00f0ff] text-black font-semibold hover:bg-[#00f0ff]/90 transition-colors text-sm"
                    >
                      {t.save}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={acceptEssentialOnly}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors text-sm font-medium"
                    >
                      {t.essentialOnly}
                    </button>
                    <button
                      onClick={() => setShowDetails(true)}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Settings className="h-4 w-4" />
                      {t.customize}
                    </button>
                    <button
                      onClick={acceptAll}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-[#00f0ff] text-black font-semibold hover:bg-[#00f0ff]/90 transition-colors text-sm"
                    >
                      {t.acceptAll}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface ConsentCategoryProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function ConsentCategory({ title, description, checked, disabled, onChange }: ConsentCategoryProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
        disabled
          ? 'border-white/5 bg-white/5 cursor-not-allowed'
          : checked
            ? 'border-[#00f0ff]/30 bg-[#00f0ff]/5'
            : 'border-white/10 hover:border-white/20'
      )}
    >
      <div className="pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className={cn(
            'h-4 w-4 rounded border-2 appearance-none transition-colors',
            disabled
              ? 'border-gray-600 bg-gray-700 cursor-not-allowed'
              : checked
                ? 'border-[#00f0ff] bg-[#00f0ff]'
                : 'border-gray-500 hover:border-gray-400'
          )}
          style={{
            backgroundImage: checked
              ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='black' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`
              : undefined,
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium', disabled ? 'text-gray-500' : 'text-white')}>
            {title}
          </span>
          {disabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 font-mono uppercase">
              Required
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </label>
  );
}
