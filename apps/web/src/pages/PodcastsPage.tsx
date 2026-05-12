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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCuratedPodcasts } from '../hooks/useCuratedPodcasts';
import { usePodcastEpisodes } from '../hooks/usePodcastEpisodes';
import { useAuth } from '../contexts/AuthContext';
import { UpgradePrompt } from '../components/subscription/UpgradePrompt';
import { isNativeApp } from '../lib/platform';
import { PodcastEpisodeCard } from '../components/podcasts/PodcastEpisodeCard';
import {
  PodcastPlayer,
  type PodcastPlayerHandle,
} from '../components/podcasts/PodcastPlayer';
import { TranscriptDrawer } from '../components/podcasts/TranscriptDrawer';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';
import type { PodcastEpisode, PodcastFeed } from '../types/podcasts';

function transcriptHitKey(hit: TranscriptHit): string {
  return `${hit.episodeId}-${hit.startSec ?? 0}`;
}

async function fetchEpisode(episodeId: string): Promise<PodcastEpisode | null> {
  const r = await apiFetch(`/api/podcasts/episodes/${encodeURIComponent(episodeId)}`);
  if (!r.ok) throw new Error(`episode-fetch ${r.status}`);
  const body = await r.json();
  return (body.data ?? null) as PodcastEpisode | null;
}

interface TranscriptHit {
  episodeId: string;
  episodeTitle: string;
  podcastTitle: string;
  excerpt: string;
  startSec?: number;
}

interface TranscriptHitExpansionProps {
  hit: TranscriptHit;
  playerRef: React.MutableRefObject<PodcastPlayerHandle | null>;
}

/**
 * Inline expansion shown under a clicked transcript hit. Fetches the
 * underlying episode, mounts a PodcastPlayer that auto-seeks to the hit's
 * timestamp + autoplays, and renders a TranscriptDrawer wired through the
 * player ref so segment clicks seek the audio.
 */
function TranscriptHitExpansion({ hit, playerRef }: TranscriptHitExpansionProps) {
  const { t } = useTranslation(['podcasts', 'common']);
  const [currentSec, setCurrentSec] = useState(hit.startSec ?? 0);
  const { data: episode, isLoading, error } = useQuery({
    queryKey: ['podcast-episode', hit.episodeId],
    queryFn: () => fetchEpisode(hit.episodeId),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="border-t border-gray-700 p-3 flex items-center gap-2 text-xs text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{t('common:loading')}</span>
      </div>
    );
  }
  if (error || !episode || !episode.audioUrl) {
    return (
      <div className="border-t border-gray-700 p-3 text-xs text-[#ff0044]">
        {t('podcasts:transcript.unavailable')}
      </div>
    );
  }

  return (
    <div className="border-t border-gray-700 p-3 space-y-3">
      <PodcastPlayer
        ref={playerRef}
        audioUrl={episode.audioUrl}
        title={episode.title}
        autoPlayOnMount
        initialSeekSec={hit.startSec}
        onTimeUpdate={setCurrentSec}
      />
      <TranscriptDrawer
        contentType="podcast"
        id={hit.episodeId}
        onSeek={(sec) => playerRef.current?.seek(sec)}
        currentSec={currentSec}
      />
    </div>
  );
}

async function fetchTranscriptSearch(query: string): Promise<TranscriptHit[]> {
  const url = `/api/podcasts/transcripts/search?q=${encodeURIComponent(query)}`;
  const r = await apiFetch(url);
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

  const [explicitFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [transcriptSearchOn, setTranscriptSearchOn] = useState(false);
  const [transcriptHits, setTranscriptHits] = useState<TranscriptHit[]>([]);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [expandedHitKey, setExpandedHitKey] = useState<string | null>(null);
  const playerRef = useRef<PodcastPlayerHandle | null>(null);

  const {
    data: feeds,
    isLoading: feedsLoading,
    error: feedsError,
    refetch: refetchFeeds,
  } = useCuratedPodcasts();

  // Auto-select the first feed once loaded so the page isn't empty.
  // Derived during render — avoids the react-hooks/set-state-in-effect
  // pattern of setSelectedFeedId(feeds[0].id) inside a useEffect.
  const selectedFeedId = explicitFeedId ?? feeds?.[0]?.id ?? null;

  const { data: episodes, isLoading: episodesLoading } = usePodcastEpisodes(
    selectedFeedId ?? '',
  );

  // Gate for the transcript-search effect. When false, the displayed hits /
  // error are read from the derived values below — we never call setState
  // inside an early-return branch (react-hooks/set-state-in-effect).
  const isTranscriptSearchActive =
    isPremium && transcriptSearchOn && !!searchQ.trim();

  // Server-side transcript search (PREMIUM only). Fires when the gate is
  // true. State setters live in fetch callbacks (allowed); the effect body
  // contains no direct setState calls.
  useEffect(() => {
    if (!isTranscriptSearchActive) return;
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
  }, [isTranscriptSearchActive, searchQ, t]);

  // Display values: ignore stale hits/error when the gate is off so the
  // closed-state UI matches the original setState(reset)-on-gate behavior.
  const displayedTranscriptHits = isTranscriptSearchActive ? transcriptHits : [];
  const displayedTranscriptError = isTranscriptSearchActive ? transcriptError : null;

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

      {displayedTranscriptError && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-[#ff0044]/30 bg-[#ff0044]/10 p-2 text-xs text-[#ff0044]"
        >
          {displayedTranscriptError}
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

          {transcriptSearchOn && isPremium && displayedTranscriptHits.length > 0 && (
            <ul className="space-y-2">
              {displayedTranscriptHits.map((hit) => {
                const key = transcriptHitKey(hit);
                const isExpanded = expandedHitKey === key;
                return (
                  <li
                    key={key}
                    className="rounded-md border border-gray-700 bg-gray-800"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHitKey(isExpanded ? null : key)
                      }
                      aria-expanded={isExpanded}
                      aria-label={`${hit.episodeTitle} — ${hit.podcastTitle}`}
                      className="block w-full p-3 text-left hover:bg-gray-700/40 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]/50 rounded-md cursor-pointer transition-colors"
                    >
                      <p className="text-sm font-semibold text-white">
                        {hit.episodeTitle}
                      </p>
                      <p className="text-xs text-gray-400">{hit.podcastTitle}</p>
                      <p className="mt-1 text-xs text-gray-300">{hit.excerpt}</p>
                    </button>
                    {isExpanded && (
                      <TranscriptHitExpansion
                        hit={hit}
                        playerRef={playerRef}
                      />
                    )}
                  </li>
                );
              })}
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
