import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useBackendStatus } from '../hooks/useBackendStatus';

export function OfflineBanner() {
  const { isOnline, isChecking, error, retry } = useBackendStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden border-b border-[#ff0044]/30"
        >
          <div className="bg-gradient-to-r from-[#ff0044]/20 via-[#ff0044]/10 to-[#ff0044]/20 backdrop-blur-sm">
            <div className="flex items-center justify-between px-6 py-3">
              {/* Left: Icon + Message */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#ff0044]/20 border border-[#ff0044]/40">
                  <WifiOff className="h-4 w-4 text-[#ff0044]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#ff0044]" />
                    <span className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
                      Backend Offline
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    {error || 'Cannot connect to backend server'} - Some features may be unavailable
                  </p>
                </div>
              </div>

              {/* Right: Retry Button */}
              <button
                onClick={retry}
                disabled={isChecking}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff0044]/20 border border-[#ff0044]/40 text-white hover:bg-[#ff0044]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                <span className="text-xs font-mono uppercase tracking-wider">
                  {isChecking ? 'Checking...' : 'Retry'}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
