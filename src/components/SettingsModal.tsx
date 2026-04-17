import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SettingsModalProps {
  children: React.ReactNode;
  isOpen: boolean;
}

export function SettingsModal({ children, isOpen }: SettingsModalProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the background location (where user came from)
  const backgroundLocation = location.state?.backgroundLocation;

  const handleClose = useCallback(() => {
    if (backgroundLocation) {
      // Go back to the background location
      navigate(backgroundLocation.pathname, { replace: true });
    } else {
      // Fallback to home if opened directly
      navigate('/', { replace: true });
    }
  }, [navigate, backgroundLocation]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-4 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8"
          >
            <div className="relative w-full max-w-2xl">
              {/* Close button - fixed at top right */}
              <button
                onClick={handleClose}
                className="absolute -top-2 -right-2 z-10 rounded-full bg-gray-800 p-2 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 shadow-lg transition-colors"
                aria-label="Close Settings"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Content */}
              <div className="rounded-xl bg-[#0a0e1a] border border-[#00f0ff]/20 shadow-2xl shadow-[#00f0ff]/5 overflow-hidden">
                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-6">
                  {children}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
