import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import { logger } from '../../lib/logger';
import { apiFetch } from '../../lib/api';

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataExportModal({ isOpen, onClose }: DataExportModalProps) {
  const { language } = useAppStore();
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await apiFetch(`/api/account/export?format=${format}`);

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newshub-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (e) {
      logger.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

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
                <div className="p-3 rounded-xl bg-[#00f0ff]/20">
                  <Download className="h-6 w-6 text-[#00f0ff]" />
                </div>
                <h2 className="text-lg font-bold text-white font-mono">
                  {language === 'de' ? 'Daten exportieren' : 'Export Data'}
                </h2>
              </div>

              <p className="text-gray-400 mb-6">
                {language === 'de'
                  ? 'Laden Sie Ihre NewsHub-Daten herunter, einschließlich Badges, Lesezeichen und Profil.'
                  : 'Download your NewsHub data including badges, bookmarks, and profile.'}
              </p>

              {/* Format Selection */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setFormat('json')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border transition-colors',
                    format === 'json'
                      ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff]'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  )}
                >
                  <FileJson className="h-5 w-5" />
                  <span className="font-mono">JSON</span>
                </button>
                <button
                  onClick={() => setFormat('csv')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border transition-colors',
                    format === 'csv'
                      ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff]'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  )}
                >
                  <FileSpreadsheet className="h-5 w-5" />
                  <span className="font-mono">CSV</span>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
                >
                  {language === 'de' ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1 py-2 rounded-lg bg-[#00f0ff] text-black font-medium hover:bg-[#00d4e6] transition-colors flex items-center justify-center gap-2"
                >
                  {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {language === 'de' ? 'Herunterladen' : 'Download'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
