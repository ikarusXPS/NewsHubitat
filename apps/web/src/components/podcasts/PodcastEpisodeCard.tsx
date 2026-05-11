/**
 * PodcastEpisodeCard — single-episode card with cover, meta, and play
 * (Phase 40-04 / D-B3 / T-40-04-02).
 *
 * Accepts either a flat `MatchedEpisode` (from useRelatedPodcasts — has
 * `episodeTitle` / `podcastTitle` siblings) or a Prisma `PodcastEpisode`
 * row (from usePodcastEpisodes — has plain `title` and no podcastTitle;
 * the parent passes `podcastTitle` in via the optional override prop).
 *
 * Description is rendered as PLAIN TEXT only — never injected as HTML.
 * 40-03 strips HTML at the persistence boundary, but we belt-and-brace
 * here so even if a discovery-mode episode slips through with `<script>`
 * tags, the DOM never gets them (T-40-04-02).
 */

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pause, Play, Headphones } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ResponsiveImage } from '../ResponsiveImage';
import { formatDateTime } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { PodcastPlayer, type PodcastPlayerHandle } from './PodcastPlayer';
import type { MatchedEpisode, PodcastEpisode } from '../../types/podcasts';

/** Either flat (matched) or row (per-feed) — both have audioUrl + publishedAt. */
export type EpisodeLike = MatchedEpisode | PodcastEpisode;

interface PodcastEpisodeCardProps {
  episode: EpisodeLike;
  /** Override episode title — required when `episode` is a Prisma row that uses `title`. */
  episodeTitle?: string;
  /** Required when `episode` is a Prisma row (no podcastTitle on that shape). */
  podcastTitle?: string;
  onPlay?: (episode: EpisodeLike) => void;
  className?: string;
}

const FALLBACK_COVER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'><rect width='64' height='64' fill='%23111827'/><path d='M32 18a8 8 0 0 1 8 8v8a8 8 0 0 1-16 0v-8a8 8 0 0 1 8-8z' fill='%2300f0ff'/><path d='M22 36v2a10 10 0 0 0 20 0v-2' stroke='%2300f0ff' stroke-width='2'/><line x1='32' y1='48' x2='32' y2='54' stroke='%2300f0ff' stroke-width='2'/></svg>",
  );

function formatSec(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s) || s < 0) return '';
  const total = Math.floor(s);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

function pickEpisodeTitle(ep: EpisodeLike, override?: string): string {
  if (override) return override;
  // Prefer matched-shape episodeTitle, fall through to Prisma row title.
  return (ep as MatchedEpisode).episodeTitle ?? (ep as PodcastEpisode).title ?? '';
}

function pickPodcastTitle(ep: EpisodeLike, override?: string): string | undefined {
  if (override) return override;
  return (ep as MatchedEpisode).podcastTitle;
}

export const PodcastEpisodeCard = forwardRef<PodcastPlayerHandle, PodcastEpisodeCardProps>(
  function PodcastEpisodeCard(
    { episode, episodeTitle, podcastTitle, onPlay, className },
    ref,
  ) {
  const { t } = useTranslation('podcasts');
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<PodcastPlayerHandle | null>(null);

  // Forward seek() to the internal PodcastPlayer when mounted. When the user
  // hasn't pressed Play yet the player isn't rendered and seek is a no-op —
  // expected behavior for the discovery surface where the card owns playback
  // (RelatedPodcasts caller relies on this for transcript-segment clicks).
  useImperativeHandle(
    ref,
    () => ({
      seek(seconds: number) {
        playerRef.current?.seek(seconds);
      },
    }),
    [],
  );

  const title = pickEpisodeTitle(episode, episodeTitle);
  const podcast = pickPodcastTitle(episode, podcastTitle);
  const cover = episode.imageUrl || FALLBACK_COVER;
  const description = (episode.description ?? '').trim();

  const handlePlay = () => {
    if (onPlay) {
      onPlay(episode);
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const playLabel = isPlaying ? t('podcastEpisode.pause') : t('podcastEpisode.play');

  return (
    <div
      data-testid={`podcast-episode-${episode.id}`}
      className={cn(
        'flex gap-3 rounded-lg border border-gray-700 bg-gray-800 p-3',
        className,
      )}
    >
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded">
        <ResponsiveImage
          src={cover}
          alt={title}
          aspectRatio="1:1"
          className="h-16 w-16 rounded"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {podcast && (
          <p className="truncate text-xs text-gray-400">{podcast}</p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 font-mono">
          {episode.durationSec != null && (
            <span aria-label={t('podcastEpisode.duration')}>
              {formatSec(episode.durationSec)}
            </span>
          )}
          {episode.publishedAt && (
            <>
              {episode.durationSec != null && <span aria-hidden>·</span>}
              <span aria-label={t('podcastEpisode.publishedAt')}>
                {formatDateTime(episode.publishedAt)}
              </span>
            </>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-gray-400 line-clamp-2">
            {truncate(description, 120)}
          </p>
        )}

        <div className="mt-2">
          <button
            type="button"
            onClick={handlePlay}
            aria-label={playLabel}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#00f0ff]/30 bg-[#00f0ff]/20 px-2 py-1 text-xs font-mono text-[#00f0ff] hover:bg-[#00f0ff]/30"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <Headphones className="h-3 w-3" />
            <span>{playLabel}</span>
          </button>
        </div>

        {!onPlay && isPlaying && (
          <div className="mt-3">
            <PodcastPlayer
              ref={playerRef}
              audioUrl={episode.audioUrl}
              title={title}
              autoPlayOnMount
            />
          </div>
        )}
      </div>
    </div>
  );
  },
);
