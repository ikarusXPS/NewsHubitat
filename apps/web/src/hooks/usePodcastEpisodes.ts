import { useQuery } from '@tanstack/react-query';
import type { PodcastEpisode } from '../types/podcasts';

/**
 * Per-feed episodes query hook (Phase 40-04 / D-B3).
 *
 * Maps to `GET /api/podcasts/:feedId/episodes`. FREE-tier; 30-min staleTime.
 * The `feedId` controls the queryKey + fetch — when empty / falsy the query
 * is disabled (PodcastsPage uses this gate during the "no podcast selected"
 * initial state).
 */

export interface UsePodcastEpisodesOptions {
  limit?: number;
}

async function fetchPodcastEpisodes(
  feedId: string,
  limit?: number,
): Promise<PodcastEpisode[]> {
  const qs = typeof limit === 'number' ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const url = `/api/podcasts/${encodeURIComponent(feedId)}/episodes${qs}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch podcast episodes: ${r.status}`);
  const body = await r.json();
  return (body.data ?? []) as PodcastEpisode[];
}

export function usePodcastEpisodes(
  feedId: string,
  opts: UsePodcastEpisodesOptions = {},
) {
  const { limit } = opts;
  return useQuery({
    queryKey: ['podcast-episodes', feedId, limit ?? null],
    queryFn: () => fetchPodcastEpisodes(feedId, limit),
    staleTime: 30 * 60 * 1000, // 30 min
    enabled: !!feedId,
    retry: 1,
  });
}
