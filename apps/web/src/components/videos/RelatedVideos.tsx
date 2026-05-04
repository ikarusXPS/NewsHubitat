/**
 * RelatedVideos — lazy-collapsed "related videos" section in NewsCard
 * (Phase 40-05 / D-D1 / D-D2).
 *
 * Renders a disclosure button that, when expanded, fires
 * useRelatedVideos(articleId, true) and displays up to 3 matched videos
 * via EmbeddedVideo. The hook's `enabled` flag drives the lazy fire so
 * the article-list LCP cost stays at zero — videos only load on user
 * click.
 *
 * i18n: pulls from the `videos` namespace (filled by Task 14).
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRelatedVideos } from '../../hooks/useRelatedVideos';
import { EmbeddedVideo } from './EmbeddedVideo';
import { cn } from '../../lib/utils';

interface Props {
  articleId: string;
}

export function RelatedVideos({ articleId }: Props) {
  const { t } = useTranslation('videos');
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading } = useRelatedVideos(articleId, isExpanded);

  return (
    <div className="mt-3 border-t border-gray-700 pt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        aria-expanded={isExpanded}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#00f0ff] transition-colors"
      >
        <Video className="h-3.5 w-3.5" />
        <span>
          {isExpanded ? t('relatedVideos.heading') : t('relatedVideos.expand')}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {isExpanded && (
        <div className={cn('mt-3 space-y-3')}>
          {isLoading && (
            <div className="text-xs text-gray-500">{t('relatedVideos.loading')}</div>
          )}
          {!isLoading && data?.videos.length === 0 && (
            <div className="text-xs text-gray-500">{t('relatedVideos.empty')}</div>
          )}
          {!isLoading &&
            data?.videos.map(match => (
              <div key={match.video.id} data-testid="related-video-row">
                {match.video.youtubeId && (
                  <EmbeddedVideo
                    provider="youtube"
                    videoId={match.video.youtubeId}
                    title={match.video.title}
                  />
                )}
                {!match.video.youtubeId && match.video.vimeoId && (
                  <EmbeddedVideo
                    provider="vimeo"
                    videoId={match.video.vimeoId}
                    title={match.video.title}
                  />
                )}
                <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                  {match.video.title}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
