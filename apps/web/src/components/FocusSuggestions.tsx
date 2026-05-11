import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, AlertTriangle, Globe2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FocusSuggestion } from '../types/focus';
import { logger } from '../lib/logger';

interface FocusSuggestionsResponse {
  success: boolean;
  data: FocusSuggestion[];
  meta: {
    count: number;
    generatedAt: string;
  };
}

export function FocusSuggestions() {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Poll suggestions every 5 minutes
  const { data } = useQuery<FocusSuggestionsResponse>({
    queryKey: ['focus-suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/focus/suggestions');
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 4 * 60 * 1000, // 4 minutes
  });

  // Filter out dismissed suggestions - memoized to stabilize reference
  const suggestions = useMemo(
    () => data?.data?.filter((s) => !dismissedIds.has(s.id)) || [],
    [data?.data, dismissedIds]
  );

  // Auto-dismiss suggestions after 30 seconds
  useEffect(() => {
    if (suggestions.length === 0) return;

    const timers = suggestions.map((suggestion) =>
      setTimeout(() => {
        setDismissedIds((prev) => new Set(prev).add(suggestion.id));
      }, 30000)
    );

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [suggestions]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const handleApplySuggestion = (suggestion: FocusSuggestion) => {
    // TODO: Implement focus switching logic
    // This will be implemented in Phase 7 when we add the focus selector
    logger.log('Apply suggestion:', suggestion.preset.name);
    handleDismiss(suggestion.id);
  };

  const getIcon = (reason: FocusSuggestion['reason']) => {
    switch (reason) {
      case 'tension-spike':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'breaking-news':
        return <TrendingUp className="w-5 h-5 text-cyan-400" />;
      case 'coverage-gap':
        return <Globe2 className="w-5 h-5 text-yellow-400" />;
      default:
        return <TrendingUp className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getReasonLabel = (reason: FocusSuggestion['reason']) => {
    switch (reason) {
      case 'tension-spike':
        return 'Tension Alert';
      case 'breaking-news':
        return 'Breaking News';
      case 'coverage-gap':
        return 'Coverage Gap';
      case 'trending':
        return 'Trending';
      default:
        return 'Suggestion';
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-md max-h-[calc(100vh-4rem)] overflow-y-auto pointer-events-auto">
      <AnimatePresence>
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-slate-900/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 shadow-lg shadow-cyan-500/10"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                {getIcon(suggestion.reason)}
                <div>
                  <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                    {getReasonLabel(suggestion.reason)}
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {suggestion.preset.icon} {suggestion.preset.name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDismiss(suggestion.id)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Dismiss suggestion"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Trigger Event */}
            <p className="text-sm text-slate-300 mb-3 leading-relaxed">
              {suggestion.triggerEvent}
            </p>

            {/* Relevance Score */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${suggestion.relevanceScore}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                />
              </div>
              <span className="text-xs font-mono text-slate-400">
                {Math.round(suggestion.relevanceScore)}% relevance
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApplySuggestion(suggestion)}
                className="flex-1 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 rounded font-mono text-sm transition-colors"
              >
                Switch to {suggestion.preset.icon}
              </button>
              <button
                onClick={() => handleDismiss(suggestion.id)}
                className="px-3 py-2 text-slate-400 hover:text-white font-mono text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-slate-500 font-mono mt-2 text-right">
              {new Date(suggestion.timestamp).toLocaleTimeString()}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
