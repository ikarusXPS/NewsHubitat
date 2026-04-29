import { ExternalLink } from 'lucide-react';
import { cn, getRegionColor } from '../../lib/utils';
import type { FactCheckCitation } from '../../hooks/useFactCheck';

export interface CitationCardProps {
  citation: FactCheckCitation;
  className?: string;
}

/**
 * Citation card per D-13 LOCKED — visual goal: make multi-region diversity of
 * evidence visible. Reuses `getRegionColor` from `lib/utils.ts`.
 *
 * Security note (T-38-21): the card always links to the in-app
 * `/article/:articleId` route — never to an arbitrary URL. The `citation.url`
 * field is intentionally not used for the href so a compromised network path
 * cannot inject a malicious link.
 */
export function CitationCard({ citation, className }: CitationCardProps) {
  return (
    <a
      href={`/article/${encodeURIComponent(citation.articleId)}`}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors',
        className
      )}
    >
      <span
        className={cn(
          'rounded px-2 py-0.5 text-[10px] font-mono text-white',
          getRegionColor(citation.region)
        )}
      >
        {citation.region.toUpperCase()}
      </span>
      <span className="text-sm text-gray-200 truncate flex-1">{citation.title}</span>
      <span className="text-[10px] text-gray-500 font-mono">{citation.sourceName}</span>
      <ExternalLink className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
    </a>
  );
}
