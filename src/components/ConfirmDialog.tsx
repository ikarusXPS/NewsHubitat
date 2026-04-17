import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const VARIANT_COLORS = {
  danger: {
    border: 'border-[#ff0044]/30',
    bg: 'bg-[#ff0044]/10',
    text: 'text-[#ff0044]',
    button: 'bg-[#ff0044] hover:bg-[#cc0036]',
  },
  warning: {
    border: 'border-[#ff6600]/30',
    bg: 'bg-[#ff6600]/10',
    text: 'text-[#ff6600]',
    button: 'bg-[#ff6600] hover:bg-[#cc5200]',
  },
  info: {
    border: 'border-[#00f0ff]/30',
    bg: 'bg-[#00f0ff]/10',
    text: 'text-[#00f0ff]',
    button: 'bg-[#00f0ff] hover:bg-[#00c0cc]',
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmDialogProps) {
  const colors = VARIANT_COLORS[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'relative w-full max-w-sm rounded-lg border p-6 backdrop-blur-xl shadow-2xl',
                'bg-[#0a0e1a]/95',
                colors.border
              )}
            >
              {/* Close button */}
              <button
                onClick={onCancel}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('rounded-lg p-2', colors.bg)}>
                  <AlertTriangle className={cn('h-5 w-5', colors.text)} />
                </div>
                <h3 className="text-lg font-mono font-medium text-white">{title}</h3>
              </div>

              {/* Message */}
              <p className="text-sm text-gray-400 mb-6 font-mono">{message}</p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onConfirm}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2 text-sm font-mono text-white transition-colors',
                    colors.button
                  )}
                >
                  {confirmText}
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-mono text-gray-400 hover:border-gray-600 hover:text-white transition-colors"
                >
                  {cancelText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
