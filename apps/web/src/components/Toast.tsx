import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

const TOAST_COLORS: Record<ToastType, { border: string; bg: string; text: string; icon: string }> = {
  success: {
    border: 'border-[#00ff88]/30',
    bg: 'bg-[#00ff88]/10',
    text: 'text-[#00ff88]',
    icon: 'text-[#00ff88]',
  },
  error: {
    border: 'border-[#ff0044]/30',
    bg: 'bg-[#ff0044]/10',
    text: 'text-[#ff0044]',
    icon: 'text-[#ff0044]',
  },
  info: {
    border: 'border-[#00f0ff]/30',
    bg: 'bg-[#00f0ff]/10',
    text: 'text-[#00f0ff]',
    icon: 'text-[#00f0ff]',
  },
};

export function Toast({ message, type = 'info', isOpen, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  const colors = TOAST_COLORS[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-24 right-6 z-[100] max-w-sm"
        >
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 backdrop-blur-xl shadow-2xl',
              colors.border,
              colors.bg
            )}
          >
            <div className={colors.icon}>{TOAST_ICONS[type]}</div>
            <p className={cn('text-sm font-mono flex-1', colors.text)}>{message}</p>
            <button
              onClick={onClose}
              className={cn('hover:opacity-70 transition-opacity', colors.icon)}
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
