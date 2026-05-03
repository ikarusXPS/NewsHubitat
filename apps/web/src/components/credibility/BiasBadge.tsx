import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export interface BiasBadgeProps {
  /** Political bias on the [-1, 1] scale (D-04 LOCKED). */
  politicalBias: number;
  className?: string;
}

/**
 * Bias bucket badge using the D-04 LOCKED thresholds (verbatim from
 * MediaBiasBar.tsx:24-31 + SourceRow.tsx:73-87 — single source of truth):
 *
 *   politicalBias < -0.2  → 'left'   (text-blue-400)
 *   -0.2 <= bias <= 0.2   → 'center' (text-gray-400)
 *   politicalBias >  0.2  → 'right'  (text-red-400)
 *
 * Boundary values at ±0.2 fall into 'center' because the bucket conditions
 * are strict-less-than / strict-greater-than.
 */
export function BiasBadge({ politicalBias, className }: BiasBadgeProps) {
  const { t } = useTranslation('credibility');

  const bucket: 'left' | 'center' | 'right' =
    politicalBias < -0.2 ? 'left' : politicalBias > 0.2 ? 'right' : 'center';

  const colorClass =
    bucket === 'left'
      ? 'text-blue-400'
      : bucket === 'right'
        ? 'text-red-400'
        : 'text-gray-400';

  return (
    <span className={cn('text-[10px] font-mono', colorClass, className)}>
      {t(`bias.${bucket}`)}
    </span>
  );
}
