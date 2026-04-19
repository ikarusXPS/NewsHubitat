import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ClearHistoryModal({ isOpen, onClose, onConfirm }: ClearHistoryModalProps) {
  const { language } = useAppStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-[#ff6600]/20">
                  <AlertTriangle className="h-6 w-6 text-[#ff6600]" />
                </div>
                <h2 className="text-lg font-bold text-white font-mono">
                  {language === 'de' ? 'Verlauf löschen?' : 'Clear Reading History?'}
                </h2>
              </div>

              <p className="text-gray-400 mb-6">
                {language === 'de'
                  ? 'Dies entfernt Ihren gesamten Leseverlauf. Ihre Badges und Erfolge bleiben erhalten.'
                  : 'This will remove all your reading history. Your badges and achievements will be preserved.'}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
                >
                  {language === 'de' ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 py-2 rounded-lg bg-[#ff6600] text-black font-medium hover:bg-[#e65c00] transition-colors"
                >
                  {language === 'de' ? 'Verlauf löschen' : 'Clear History'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
