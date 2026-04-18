import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target } from 'lucide-react';
import { useAppStore } from '../store';
import type { NewsSource } from '../types';

interface SourceFilterBannerProps {
  sources?: NewsSource[];
}

export function SourceFilterBanner({ sources = [] }: SourceFilterBannerProps) {
  const { feedState, setActiveSourceFilter } = useAppStore();
  const [sourceName, setSourceName] = useState<string | null>(null);

  // Find source name when filter is active
  useEffect(() => {
    if (feedState.activeSourceFilter) {
      const source = sources.find((s) => s.id === feedState.activeSourceFilter);
      setSourceName(source?.name || feedState.activeSourceFilter);
    } else {
      setSourceName(null);
    }
  }, [feedState.activeSourceFilter, sources]);

  const handleClear = () => {
    setActiveSourceFilter(null);
  };

  return (
    <AnimatePresence>
      {feedState.activeSourceFilter && sourceName && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#00f0ff]/5 border border-[#00f0ff]/20">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-[#00f0ff]/10">
                <Target className="h-4 w-4 text-[#00f0ff]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Filtered by:
                </span>
                <span className="text-sm font-medium text-[#00f0ff]">
                  {sourceName}
                </span>
              </div>
            </div>

            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filter
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
