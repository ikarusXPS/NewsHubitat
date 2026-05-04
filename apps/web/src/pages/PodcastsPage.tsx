/**
 * PodcastsPage — browse curated podcasts + episode list + two-tier search
 * (Phase 40-04 / D-B3 / Q-05 / CC-01).
 *
 * Two-pane layout:
 *   - Left: curated PodcastFeed list (useCuratedPodcasts)
 *   - Right: selected feed's episode list (usePodcastEpisodes)
 *
 * Search:
 *   - FREE for everyone: client-side filter on episode title + podcast title
 *   - PREMIUM only: transcript-excerpt search via
 *     /api/podcasts/transcripts/search (40-06 wires the endpoint)
 *
 * Reader-app exemption (CC-01 / Apple Rule 3.1.1(a)):
 *   - Web FREE → <UpgradePrompt inline> next to a disabled checkbox
 *   - Mobile FREE → plain text + <span>newshub.example</span>; NO <a>, NO
 *     /pricing reference, NO upgrade CTA
 *   - PREMIUM/ENTERPRISE → enabled checkbox; toggle ON fires server call
 *
 * 40-06 will hook the TranscriptDrawer into PodcastEpisodeCard (per-episode);
 * this page does not need changes for transcript work — the TranscriptHit
 * shape is consumed only when the toggle is ON, in a result list rendered
 * inline below the search bar.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import { useCuratedPodcasts } from '../hooks/useCuratedPodcasts';
import { usePodcastEpisodes } from '../hooks/usePodcastEpisodes';
import { useAuth } from '../contexts/AuthContext';
import { UpgradePrompt } from '../components/subscription/UpgradePrompt';
import { isNativeApp } from '../lib/platform';
import { PodcastEpisodeCard } from '../components/podcasts/PodcastEpisodeCard';
import { cn } from '../lib/utils';
import type { PodcastEpisode, PodcastFeed } from '../types/podcasts';

interface TranscriptHit {
  episodeId: string;
  episodeTitle: string;
  podcastTitle: string;
  excerpt: string;
  startSec?: number;
}

async function fetchTranscriptSearch(query: string): Promise<TranscriptHit[]> {
  const url = `/api/podcasts/transcripts/search?q=${encodeURIComponent(query)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`transcript-search ${r.status}`);
  const body = await r.json();
  return (body.data ?? []) as TranscriptHit[];
}

function feedTitleFor(
  feeds: PodcastFeed[] | undefined,
  feedId: string | null,
): string | undefined {
  if (!feeds || !feedId) return undefined;
  return feeds.find((f) => f.id === feedId)?.title;
}

export function PodcastsPage() {
  const { t } = useTranslation(['podcasts', 'common']);
  const { user } = useAuth();
  const isPremium =
    user?.subscriptionTier === 'PREMIUM' ||
    user?.subscriptionTier === 'ENTERPRISE';
  const isMobile = isNativeApp();

  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [transcriptSearchOn, setTranscriptSearchOn] = useState(false);
  const [transcriptHits, setTranscriptHits] = useState<TranscriptHit[]>([]);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const {
    data: feeds,
    isLoading: feedsLoading,
    error: feedsError,
    refetch: refetchFeeds,
  } = useCuratedPodcasts();

  const { data: episodes, isLoading: episodesLoading } = usePodcastEpisodes(
    selectedFeedId ?? '',
  );

  // Auto-select the first feed once loaded so the page isn't empty
  useEffect(() => {
    if (!selectedFeedId && feeds && feeds.length > 0) {
      setSelectedFeedId(feeds[0].id);
    }
  }, [feeds, selectedFeedId]);

  // Server-side transcript search (PREMIUM only). Fires when toggle is ON
  // AND the query is non-empty. Failures are non-blocking — the page still
  // shows client-side filtered episodes.
  useEffect(() => {
    if (!isPremium || !transcriptSearchOn || !searchQ.trim()) {
      setTranscriptHits([]);
      setTranscriptError(null);
      return;
    }
    let cancelled = false;
    fetchTranscriptSearch(searchQ.trim())
      .then((hits) => {
        if (!cancelled) {
          setTranscriptHits(hits);
          setTranscriptError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTranscriptHits([]);
          setTranscriptError(t('podcasts:podcastsPage.transcriptSearchUnavailable'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isPremium, transcriptSearchOn, searchQ, t]);

  const podcastTitle = feedTitleFor(feeds, selectedFeedId);

  const filteredEpisodes: PodcastEpisode[] = useMemo(() => {
    if (!episodes) return [];
    // When transcript-search is ON we don't client-filter — the transcript
    // hit list is the search result.
    if (transcriptSearchOn || !searchQ.trim()) return episodes;
    const q = searchQ.toLowerCase();
    return episodes.filter((e) => {
      const inTitle = e.title.toLowerCase().includes(q);
      const inPodcast = (podcastTitle ?? '').toLowerCase().includes(q);
      return inTitle || inPodcast;
    });
  }, [episodes, searchQ, transcriptSearchOn, podcastTitle]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="mb-4 text-2xl font-bold text-white font-mono">
        {t('podcasts:podcastsPage.title')}
      </h1>

      {/* Search row + transcript-search gate */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={t('podcasts:podcastsPage.searchPlaceholder')}
            className="w-full rounded-md border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-[#00f0ff] focus:outline-none"
          />
        </label>

        <div className="flex items-center gap-2">
          {isPremium && (
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={transcriptSearchOn}
                onChange={(e) => setTranscriptSearchOn(e.target.checked)}
                className="accent-[#00f0ff]"
              />
              <span className="font-mono text-xs">
                {t('podcasts:podcastsPage.transcriptSearchToggle')}
              </span>
            </label>
          )}

          {!isPremium && !isMobile && (
            <UpgradePrompt
              inline
              feature={t('podcasts:podcastsPage.transcriptSearchFeature')}
            />
          )}

          {!isPremium && isMobile && (
            <p className="text-xs text-gray-400">
              {t('podcasts:podcastsPage.transcriptSearchMobileNotAvailable')}{' '}
              <span className="font-mono">newshub.example</span>
            </p>
          )}
        </div>
      </div>

      {transcriptError && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-[#ff0044]/30 bg-[#ff0044]/10 p-2 text-xs text-[#ff0044]"
        >
          {transcriptError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        {/* Left: feed list */}
        <aside className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
          {feedsLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-[#00f0ff]" />
          )}
          {feedsError && (
            <div className="space-y-2">
              <p className="flex items-center gap-1 text-xs text-[#ff0044]">
                <AlertCircle className="h-3.5 w-3.5" />
                {t('podcasts:podcastsPage.loadError')}
              </p>
              <button
                type="button"
                onClick={() => refetchFeeds()}
                className="rounded border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-2 py-1 text-xs font-mono text-[#00f0ff] hover:bg-[#00f0ff]/20"
              >
                {t('common:buttons.load')}
              </button>
            </div>
          )}
          {!feedsLoading && !feedsError && feeds && (
            <ul className="space-y-1">
              {feeds.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedFeedId(f.id)}
                    className={cn(
                      'w-full truncate rounded px-2 py-1.5 text-left text-sm',
                      selectedFeedId === f.id
                        ? 'bg-[#00f0ff]/15 text-[#00f0ff]'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                    )}
                  >
                    {f.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Right: episode list (or transcript hits) */}
        <section className="space-y-2">
          {!selectedFeedId && feeds && feeds.length === 0 && (
            <p className="text-sm text-gray-400">
              {t('podcasts:podcastsPage.selectPodcast')}
            </p>
          )}

          {episodesLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-[#00f0ff]" />
          )}

          {transcriptSearchOn && isPremium && transcriptHits.length > 0 && (
            <ul className="space-y-2">
              {transcriptHits.map((hit) => (
                <li
                  key={`${hit.episodeId}-${hit.startSec ?? 0}`}
                  className="rounded-md border border-gray-700 bg-gray-800 p-3"
                >
                  <p className="text-sm font-semibold text-white">
                    {hit.episodeTitle}
                  </p>
                  <p className="text-xs text-gray-400">{hit.podcastTitle}</p>
                  <p className="mt-1 text-xs text-gray-300">{hit.excerpt}</p>
                </li>
              ))}
            </ul>
          )}

          {!transcriptSearchOn && filteredEpisodes.length === 0 && episodes && (
            <p className="text-sm text-gray-500">
              {t('podcasts:podcastsPage.noResults')}
            </p>
          )}

          {!transcriptSearchOn &&
            filteredEpisodes.map((ep) => (
              <PodcastEpisodeCard
                key={ep.id}
                episode={ep}
                episodeTitle={ep.title}
                podcastTitle={podcastTitle}
              />
            ))}
        </section>
      </div>
    </div>
  );
}
