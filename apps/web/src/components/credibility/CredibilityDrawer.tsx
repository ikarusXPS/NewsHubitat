import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { CredibilityPill } from './CredibilityPill';
import { BiasBadge } from './BiasBadge';
import type { CredibilityResult } from '../../hooks/useCredibility';

export interface CredibilityDrawerProps {
  data: CredibilityResult;
  onClose?: () => void;
  className?: string;
}

/**
 * Map the server-side bias bucket back to a representative -1..1 probe value
 * so BiasBadge can render with the same threshold logic the rest of the app
 * uses. The drawer doesn't have access to the raw political-bias number
 * (the score is already collapsed to a bucket on the server).
 */
function biasProbe(bucket: 'left' | 'center' | 'right'): number {
  if (bucket === 'left') return -0.5;
  if (bucket === 'right') return 0.5;
  return 0;
}

/**
 * Methodology / sub-dimensions panel that opens beneath a CredibilityPill.
 * Mirrors the MediaBiasBar.tsx shell (glass-panel + signal-label + tooltip
 * info icon) so the visual language is consistent across the app.
 *
 * `methodologyMd` arrives as Markdown from the server. The codebase does not
 * ship `react-markdown`, so we render it as `whitespace-pre-wrap` text — good
 * enough for the prose paragraph the LLM produces; bold/italic markers are
 * rare and acceptable as-is until react-markdown lands as a dep.
 */
export function CredibilityDrawer({ data, onClose, className }: CredibilityDrawerProps) {
  const { t } = useTranslation('credibility');

  return (
    <div className={cn('glass-panel rounded-xl p-4 space-y-4', className)}>
      <div className="flex items-start justify-between">
        <h3 className="signal-label flex items-center gap-2">
          <span>{t('drawer.title')}</span>
          <Info className="h-3 w-3 text-gray-500" aria-hidden />
        </h3>
        {onClose ? (
          <button
            onClick={onClose}
            aria-label={t('drawer.close') as string}
            className="text-gray-500 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <CredibilityPill score={data.score} confidence={data.confidence} />
        <BiasBadge politicalBias={biasProbe(data.bias)} />
      </div>

      <div className="space-y-2 text-xs">
        <h4 className="text-gray-400 uppercase tracking-wide">{t('drawer.subDimensions')}</h4>
        <dl className="grid grid-cols-3 gap-2">
          <div>
            <dt className="text-gray-500">{t('drawer.accuracy')}</dt>
            <dd className="font-mono text-gray-200">{data.subDimensions.accuracy}/100</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('drawer.transparency')}</dt>
            <dd className="font-mono text-gray-200">{data.subDimensions.transparency}/100</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('drawer.corrections')}</dt>
            <dd className="font-mono text-gray-200">{data.subDimensions.corrections}/100</dd>
          </div>
        </dl>
      </div>

      <div className="text-xs text-gray-300 whitespace-pre-wrap">{data.methodologyMd}</div>

      <p className="text-[10px] text-gray-500 italic border-t border-gray-700/30 pt-2">
        {t('drawer.disclosure')}
      </p>
    </div>
  );
}
