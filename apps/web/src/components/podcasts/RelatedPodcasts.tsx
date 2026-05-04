/**
 * RelatedPodcasts — lazy-collapsed "related podcast episodes" section in
 * NewsCard (Phase 40-04 / D-B3, extended Phase 40-06 / CC-05).
 *
 * Renders a disclosure button that, when expanded, fires
 * useRelatedPodcasts(articleId, { enabled: true }) and shows up to 3
 * matched episodes. The hook's `enabled` flag drives the lazy fire — the
 * collapsed-by-default mount fires zero network calls so the article-list
 * LCP cost stays at zero (the load-bearing contract enforced by Test 1).
 *
 * 40-06 extension: each rendered episode now has a "Show transcript"
 * toggle below the card. Toggling expands one episode at a time
 * (`expandedEpisodeId`) and renders <TranscriptDrawer> with the episode's
 * id — the drawer enforces tier × platform branching internally.
 *
 * The TranscriptDrawer's onSeek callback is intentionally NOT wired to a
 * shared PodcastPlayer here because the lazy-list view doesn't host a
 * persistent audio element; PodcastEpisodeCard owns its own player when
 * expanded by the user. onSeek therefore stays undefined and
 * TranscriptSegment renders as a disabled button — acceptable UX in the
 * discovery surface. Dedicated /podcasts pages with a persistent player
 * can wire onSeek through to PodcastPlayer.seek() in a follow-up.
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Headphones,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRelatedPodcasts } from '../../hooks/useRelatedPodcasts';
import { PodcastEpisodeCard } from './PodcastEpisodeCard';
import { TranscriptDrawer } from './TranscriptDrawer';
import { cn } from '../../lib/utils';

interface RelatedPodcastsProps {
  articleId: string;
  className?: string;
}

const MAX_VISIBLE = 3;

export function RelatedPodcasts({ articleId, className }: RelatedPodcastsProps) {
  const { t } = useTranslation('podcasts');
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null);
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
          {visible.map((ep) => {
            const isTranscriptOpen = expandedEpisodeId === ep.id;
            return (
              <div key={ep.id} className="space-y-2">
                <PodcastEpisodeCard
                  episode={ep}
                  episodeTitle={ep.episodeTitle}
                  podcastTitle={ep.podcastTitle}
                />
                <button
                  type="button"
                  onClick={() =>
                    setExpandedEpisodeId(isTranscriptOpen ? null : ep.id)
                  }
                  aria-expanded={isTranscriptOpen}
                  data-testid="transcript-toggle"
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#00f0ff]/30 bg-black/30 px-2 py-1 text-xs font-mono text-[#00f0ff] hover:bg-[#00f0ff]/10"
                >
                  <FileText className="h-3 w-3" />
                  <span>
                    {isTranscriptOpen
                      ? t('transcript.hide')
                      : t('transcript.show')}
                  </span>
                </button>
                {isTranscriptOpen && (
                  <TranscriptDrawer
                    contentType="podcast"
                    id={ep.id}
                    className="rounded-lg border border-gray-800 bg-black/40"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
