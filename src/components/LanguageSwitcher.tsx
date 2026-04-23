import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
  { code: 'de', label: 'Deutsch', flag: 'DE' },
  { code: 'en', label: 'English', flag: 'EN' },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside (same pattern as FocusSelector)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - per D-05: dropdown with text "DE" */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-mono transition-all',
          'bg-[#0a0e1a]/90 backdrop-blur-sm',
          isOpen
            ? 'border-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
            : 'border-[#00f0ff]/30 hover:border-[#00f0ff]/50'
        )}
      >
        <Globe className="h-3.5 w-3.5 text-[#00f0ff]" />
        <span className="text-[#00f0ff] text-xs">{currentLang.flag}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-[#00f0ff]/70 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-36 rounded-lg border border-[#00f0ff]/20 bg-[#0a0e1a]/95 backdrop-blur-xl shadow-2xl z-50"
            style={{ boxShadow: '0 0 20px rgba(0,240,255,0.15)' }}
          >
            <div className="py-1">
              {languages.map((lang) => {
                const isActive = i18n.language === lang.code;

                return (
                  <button
                    key={lang.code}
                    onClick={() => handleChange(lang.code)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'text-[#00f0ff] bg-[#00f0ff]/10'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                    {isActive && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
