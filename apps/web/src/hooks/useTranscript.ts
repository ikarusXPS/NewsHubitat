/**
 * useTranscript — TanStack Query hook for the Premium-gated
 * `/api/transcripts/:contentType/:id` route (Phase 40-06).
 *
 * Mirrors `useCredibility.ts`: reads JWT from localStorage, attaches it as
 * a Bearer token, returns `null` on 404 (transcript_unavailable), throws on
 * other non-OK responses so TanStack's retry/onError can react.
 *
 * The `enabled` flag lets callers gate the fetch on tier (PREMIUM only) so
 * FREE users on web never trigger a network call from TranscriptDrawer.
 */

import { useQuery } from '@tanstack/react-query';
import type { ContentType, TranscriptResponse } from '../types/transcripts';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('newshub-auth-token') ?? '';
}

async function fetchTranscript(
  contentType: ContentType,
  id: string,
): Promise<TranscriptResponse | null> {
  const url = `/api/transcripts/${encodeURIComponent(contentType)}/${encodeURIComponent(id)}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Failed to fetch transcript: ${r.status}`);
  const body = (await r.json()) as { data: TranscriptResponse };
  return body.data;
}

export function useTranscript(
  contentType: ContentType,
  id: string,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['transcript', contentType, id] as const,
    queryFn: () => fetchTranscript(contentType, id),
    staleTime: 60 * 60 * 1000, // 1h — transcripts rarely change
    enabled: (options.enabled ?? true) && !!id,
    retry: 1,
  });
}
