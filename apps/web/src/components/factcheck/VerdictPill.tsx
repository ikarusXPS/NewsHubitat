import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export type Verdict = 'true' | 'mostly-true' | 'mixed' | 'unverified' | 'false';

export interface VerdictPillProps {
  verdict: Verdict;
  className?: string;
}

/**
 * 5-bucket verdict pill per D-08 LOCKED.
 *
 * Color mapping (verbatim from CONTEXT.md / RESEARCH.md State of the Art):
 *   true        → #00ff88 (green)
 *   mostly-true → #84cc16 (lime — Tailwind lime-500)
 *   mixed       → #ffee00 (yellow)
 *   unverified  → gray   (#6b7280, Tailwind gray-500)
 *   false       → #ff0044 (red)
 */
const VERDICT_CLASSES: Record<Verdict, string> = {
  'true':        'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30',
  'mostly-true': 'bg-[#84cc16]/10 text-[#84cc16] border-[#84cc16]/30',
  'mixed':       'bg-[#ffee00]/10 text-[#ffee00] border-[#ffee00]/30',
  'unverified':  'bg-gray-700/20 text-gray-400 border-gray-600/30',
  'false':       'bg-[#ff0044]/10 text-[#ff0044] border-[#ff0044]/30',
};

export function VerdictPill({ verdict, className }: VerdictPillProps) {
  const { t } = useTranslation('factcheck');

  return (
    <span
      className={cn(
        'inline-block text-xs font-mono uppercase tracking-wide px-2 py-1 rounded border',
        VERDICT_CLASSES[verdict],
        className
      )}
    >
      {t(`verdicts.${verdict}`)}
    </span>
  );
}
