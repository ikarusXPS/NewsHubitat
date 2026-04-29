import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export interface CredibilityPillProps {
  /** Deterministic 0-100 credibility score (D-04 LOCKED, computed server-side). */
  score: number;
  /** Categorical confidence bucket per D-05 LOCKED. */
  confidence?: 'low' | 'medium' | 'high';
  className?: string;
}

/**
 * Compact 0-100 credibility pill with an optional confidence sub-pill.
 *
 * Color thresholds (cyber design system, CLAUDE.md):
 *   score >= 70  → cyan   (#00f0ff)
 *   score 40-69  → yellow (#ffee00)
 *   score < 40   → red    (#ff0044)
 *
 * Confidence buckets (D-05 LOCKED):
 *   high   → cyan   (#00f0ff)
 *   medium → yellow (#ffee00)
 *   low    → gray
 */
export function CredibilityPill({ score, confidence, className }: CredibilityPillProps) {
  const { t } = useTranslation('credibility');

  const scoreClass = cn(
    'text-[10px] font-mono px-1.5 py-0.5 rounded',
    score >= 70
      ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
      : score >= 40
        ? 'bg-[#ffee00]/10 text-[#ffee00]'
        : 'bg-[#ff0044]/10 text-[#ff0044]'
  );

  const confClass = cn(
    'text-[9px] font-mono px-1 py-0.5 rounded',
    confidence === 'high'
      ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
      : confidence === 'medium'
        ? 'bg-[#ffee00]/10 text-[#ffee00]'
        : 'bg-gray-700/30 text-gray-400'
  );

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={scoreClass} aria-label={t('pill.label') as string}>
        {t('pill.label')}: {Math.round(score)}
      </span>
      {confidence ? (
        <span className={confClass}>{t(`confidence.${confidence}`)}</span>
      ) : null}
    </span>
  );
}
