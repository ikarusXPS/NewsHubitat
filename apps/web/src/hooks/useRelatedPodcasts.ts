import { useQuery } from '@tanstack/react-query';
import type { MatchedEpisode } from '../types/podcasts';

/**
 * Related-podcasts query hook (Phase 40-04 / CONT-03 / D-B3).
 *
 * Mirrors `useCredibility.ts` shape — the FREE-tier endpoint requires no
 * Authorization header. The `enabled` flag is the load-bearing knob behind
 * the collapsed-by-default `RelatedPodcasts` section: when `enabled: false`
 * (the initial state in NewsCard) no network call fires, preserving the
 * article-list LCP budget.
 *
 * staleTime 24h matches the server-side `podcast:related:{articleId}` Redis
 * cache TTL (D-B2). queryKey omits language — podcast match is language-
 * neutral by entity name (e.g. "OPEC", "Trump") and the matcher service
 * uses case-insensitive substring on raw entity strings.
 */

export interface UseRelatedPodcastsOptions {
  enabled?: boolean;
}

async function fetchRelatedPodcasts(articleId: string): Promise<MatchedEpisode[]> {
  const url = `/api/podcasts/related/${encodeURIComponent(articleId)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch related podcasts: ${r.status}`);
  const body = await r.json();
  return (body.data ?? []) as MatchedEpisode[];
}

export function useRelatedPodcasts(
  articleId: string,
  opts: UseRelatedPodcastsOptions = {},
) {
  const enabled = opts.enabled ?? true;
  return useQuery({
    queryKey: ['related-podcasts', articleId],
    queryFn: () => fetchRelatedPodcasts(articleId),
    staleTime: 24 * 60 * 60 * 1000, // 24h — matches server cache TTL per D-B2
    enabled: enabled && !!articleId,
    retry: 1,
  });
}
