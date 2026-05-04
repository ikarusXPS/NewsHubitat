import { useQuery } from '@tanstack/react-query';
import type { PodcastFeed } from '../types/podcasts';

/**
 * Curated-podcasts query hook (Phase 40-04 / D-B3).
 *
 * Fetches the static curated feed list shipped by 40-03's
 * `apps/web/server/config/podcasts.ts`. Endpoint is FREE-tier with a 24h
 * `Cache-Control: public, max-age=86400`; client staleTime 1h is plenty.
 */

async function fetchCuratedPodcasts(): Promise<PodcastFeed[]> {
  const r = await fetch('/api/podcasts');
  if (!r.ok) throw new Error(`Failed to fetch curated podcasts: ${r.status}`);
  const body = await r.json();
  return (body.data ?? []) as PodcastFeed[];
}

export function useCuratedPodcasts() {
  return useQuery({
    queryKey: ['curated-podcasts'],
    queryFn: fetchCuratedPodcasts,
    staleTime: 60 * 60 * 1000, // 1h
    retry: 1,
  });
}
