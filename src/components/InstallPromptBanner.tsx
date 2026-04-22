import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { cn } from '../lib/utils';

export function InstallPromptBanner() {
  const { showBanner, install, dismiss } = useInstallPrompt();

  if (!showBanner) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'border-t border-cyan-500/30',
          'bg-gradient-to-r from-[#00f0ff]/20 via-[#00f0ff]/10 to-[#00f0ff]/20',
          'backdrop-blur-sm'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            {/* Left: Icon + Message */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#00f0ff]/20 border border-[#00f0ff]/40">
                <Download className="h-4 w-4 text-[#00f0ff]" />
              </div>
              <div className="text-sm">
                <span className="text-white font-mono font-semibold">
                  Install NewsHub for offline access and faster loading
                </span>
              </div>
            </div>

            {/* Right: Install Button + Dismiss */}
            <div className="flex items-center gap-3">
              <button
                onClick={install}
                className={cn(
                  'px-4 py-1.5 rounded text-sm font-mono font-semibold transition-colors',
                  'bg-[#00f0ff]/20 border border-[#00f0ff]/40 text-white hover:bg-[#00f0ff]/30'
                )}
              >
                Install App
              </button>

              <button
                onClick={dismiss}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Dismiss install prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
