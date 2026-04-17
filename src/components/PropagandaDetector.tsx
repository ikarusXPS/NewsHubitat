import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { NewsArticle } from '../types';

interface PropagandaAnalysis {
  score: number; // 0-100, higher = more propaganda indicators
  indicators: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    examples?: string[];
  }[];
  summary: string;
  recommendations: string[];
}

interface PropagandaDetectorProps {
  article: NewsArticle;
  className?: string;
}

const INDICATOR_TYPES: Record<string, { label: string; icon: React.ReactNode }> = {
  emotional_language: { label: 'Emotionale Sprache', icon: '😤' },
  one_sided: { label: 'Einseitige Darstellung', icon: '⚖️' },
  missing_sources: { label: 'Fehlende Quellenangaben', icon: '📋' },
  loaded_words: { label: 'Wertende Begriffe', icon: '💬' },
  false_dilemma: { label: 'Falsches Dilemma', icon: '🔀' },
  appeal_to_fear: { label: 'Angstappell', icon: '😨' },
  bandwagon: { label: 'Mitläufer-Effekt', icon: '👥' },
  ad_hominem: { label: 'Persönlicher Angriff', icon: '👤' },
};

export function PropagandaDetector({ article, className }: PropagandaDetectorProps) {
  const [analysis, setAnalysis] = useState<PropagandaAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeArticle = async () => {
    if (analysis || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/propaganda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          source: article.source.name,
          perspective: article.perspective,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setAnalysis(data);
      setIsExpanded(true);
    } catch (err) {
      setError('Analyse fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-green-400';
    if (score < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score < 30) return 'Niedrig';
    if (score < 60) return 'Mittel';
    return 'Hoch';
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  return (
    <div className={cn('rounded-xl border border-gray-700 overflow-hidden', className)}>
      {/* Header / Trigger */}
      <button
        onClick={analysis ? () => setIsExpanded(!isExpanded) : analyzeArticle}
        disabled={isLoading}
        className={cn(
          'w-full flex items-center justify-between p-4',
          'bg-gray-800/50 hover:bg-gray-800',
          'transition-colors text-left',
          isLoading && 'cursor-wait'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              analysis
                ? analysis.score < 30
                  ? 'bg-green-500/20'
                  : analysis.score < 60
                  ? 'bg-yellow-500/20'
                  : 'bg-red-500/20'
                : 'bg-gray-700'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
            ) : analysis ? (
              analysis.score < 30 ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : analysis.score < 60 ? (
                <Info className="h-5 w-5 text-yellow-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-400" />
              )
            ) : (
              <Shield className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-white">Propaganda-Detektor</h4>
            <p className="text-xs text-gray-400">
              {isLoading
                ? 'Analysiere Artikel...'
                : analysis
                ? `Score: ${analysis.score}/100 (${getScoreLabel(analysis.score)})`
                : 'Klicken zum Analysieren'}
            </p>
          </div>
        </div>

        {analysis && (
          <div className="flex items-center gap-3">
            <span className={cn('text-2xl font-bold', getScoreColor(analysis.score))}>
              {analysis.score}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/20 border-t border-red-800/50">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Analysis details */}
      <AnimatePresence>
        {analysis && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Summary */}
              <div className="glass-dark rounded-lg p-3">
                <p className="text-sm text-gray-300">{analysis.summary}</p>
              </div>

              {/* Score visualization */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Propaganda-Indikator</span>
                  <span>{analysis.score}/100</span>
                </div>
                <div className="h-3 rounded-full bg-gray-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${analysis.score}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full',
                      analysis.score < 30
                        ? 'bg-green-500'
                        : analysis.score < 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                  />
                </div>
              </div>

              {/* Indicators */}
              {analysis.indicators.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-white mb-3">
                    Erkannte Indikatoren
                  </h5>
                  <div className="space-y-2">
                    {analysis.indicators.map((indicator, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'rounded-lg border p-3',
                          getSeverityColor(indicator.severity)
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span>{INDICATOR_TYPES[indicator.type]?.icon || '⚠️'}</span>
                          <span className="text-sm font-medium">
                            {INDICATOR_TYPES[indicator.type]?.label || indicator.type}
                          </span>
                        </div>
                        <p className="text-xs opacity-80">{indicator.description}</p>
                        {indicator.examples && indicator.examples.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs opacity-60 mb-1">Beispiele:</p>
                            <ul className="text-xs space-y-1">
                              {indicator.examples.map((ex, i) => (
                                <li key={i} className="opacity-70 italic">
                                  "{ex}"
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-white mb-2">
                    Empfehlungen
                  </h5>
                  <ul className="space-y-1">
                    {analysis.recommendations.map((rec, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-400"
                      >
                        <span className="text-blue-400">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 rounded-lg bg-blue-900/20 border border-blue-800/30 p-3">
                <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300">
                  Diese Analyse dient nur als Hilfestellung. Bitte überprüfen Sie
                  Informationen immer aus mehreren Quellen.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
