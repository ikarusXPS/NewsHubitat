import { useQuery } from '@tanstack/react-query';
import type { MatchedVideo } from '../types/videos';

/**
 * Related-videos query hook (Phase 40-05 / CONT-05 / D-D1).
 *
 * Mirrors `useCredibility.ts` shape: 24h staleTime to match the server-side
 * Redis cache TTL on `video:related:{articleId}`, `enabled` flag for the
 * collapsed-by-default lazy-fire UX in NewsCard. queryKey deliberately
 * EXCLUDES the active language — videos are language-agnostic and the
 * server-side FTS index uses the 'simple' Postgres config.
 */

export type VideoSource = 'cache' | 'local' | 'youtube-search' | 'none';

export interface RelatedVideosResult {
  videos: MatchedVideo[];
  source: VideoSource;
}

async function fetchRelatedVideos(articleId: string): Promise<RelatedVideosResult> {
  const url = `/api/videos/related/${encodeURIComponent(articleId)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch related videos: ${r.status}`);
  const body = await r.json();
  return {
    videos: (body.data ?? []) as MatchedVideo[],
    source: ((body.meta?.source ?? 'none') as VideoSource),
  };
}

export function useRelatedVideos(articleId: string, enabled = true) {
  return useQuery({
    queryKey: ['related-videos', articleId],
    queryFn: () => fetchRelatedVideos(articleId),
    staleTime: 24 * 60 * 60 * 1000, // 24h — matches server cache TTL per D-D1
    enabled: enabled && !!articleId,
    retry: 1,
  });
}
