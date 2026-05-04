/**
 * RelatedPodcasts — lazy-collapsed "related podcast episodes" section in
 * NewsCard (Phase 40-04 / D-B3).
 *
 * Renders a disclosure button that, when expanded, fires
 * useRelatedPodcasts(articleId, { enabled: true }) and shows up to 3
 * matched episodes. The hook's `enabled` flag drives the lazy fire — the
 * collapsed-by-default mount fires zero network calls so the article-list
 * LCP cost stays at zero (the load-bearing contract enforced by Test 1).
 *
 * Composition seam (40-06): the expanded panel is rendered as a stable
 * region (`role="region"`) below the toggle. 40-06's TranscriptDrawer
 * mounts INSIDE PodcastEpisodeCard (per-episode), not here, so this file
 * stays untouched for transcript work.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Headphones, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRelatedPodcasts } from '../../hooks/useRelatedPodcasts';
import { PodcastEpisodeCard } from './PodcastEpisodeCard';
import { cn } from '../../lib/utils';

interface RelatedPodcastsProps {
  articleId: string;
  className?: string;
}

const MAX_VISIBLE = 3;

export function RelatedPodcasts({ articleId, className }: RelatedPodcastsProps) {
  const { t } = useTranslation('podcasts');
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: episodes, isLoading, error } = useRelatedPodcasts(articleId, {
    enabled: isExpanded,
  });

  const visible = (episodes ?? []).slice(0, MAX_VISIBLE);

  return (
    <section className={cn('mt-3 pt-3 border-t border-gray-700', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex items-center gap-2 text-sm font-mono text-[#00f0ff] hover:text-[#00f0ff]/80"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Headphones className="h-4 w-4" />
        <span>
          {isExpanded
            ? t('relatedPodcasts.heading')
            : t('relatedPodcasts.expand')}
        </span>
        {episodes && (
          <span className="text-xs text-gray-500">({episodes.length})</span>
        )}
      </button>

      {isExpanded && (
        <div role="region" className="mt-3 space-y-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-[#00f0ff]" />
          )}
          {error && (
            <p className="text-xs text-[#ff0044]">
              {t('relatedPodcasts.loadError')}
            </p>
          )}
          {!isLoading && !error && episodes && episodes.length === 0 && (
            <p className="text-xs text-gray-500">
              {t('relatedPodcasts.empty')}
            </p>
          )}
          {visible.map((ep) => (
            <PodcastEpisodeCard
              key={ep.id}
              episode={ep}
              episodeTitle={ep.episodeTitle}
              podcastTitle={ep.podcastTitle}
            />
          ))}
        </div>
      )}
    </section>
  );
}
