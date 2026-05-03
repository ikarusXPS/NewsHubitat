import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store';

/**
 * Server-side credibility result shape (matches CredibilityResponseSchema in
 * server/openapi/schemas.ts; produced by AIService.getSourceCredibility).
 *
 * `score` is the deterministic 0-100 value computed from
 * source.bias.reliability * 7 - |source.bias.political| * 30 (D-04 LOCKED).
 * `methodologyMd` is locale-aware LLM-attributed text.
 */
export interface CredibilitySubDimensions {
  accuracy: number;
  transparency: number;
  corrections: number;
}

export interface CredibilityResult {
  sourceId: string;
  score: number;
  bias: 'left' | 'center' | 'right';
  subDimensions: CredibilitySubDimensions;
  methodologyMd: string;
  confidence: 'low' | 'medium' | 'high';
  generatedAt: string;
  locale: 'de' | 'en' | 'fr';
}

/**
 * Read the JWT from localStorage. The repo-wide convention (see AuthContext.tsx)
 * is the key `'newshub-auth-token'`. Returning `''` falls through to an
 * unauthenticated request — the route layer rejects with 401 if needed.
 */
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('newshub-auth-token') ?? '';
}

async function fetchCredibility(
  sourceId: string,
  locale: string
): Promise<CredibilityResult> {
  const url = `/api/ai/source-credibility/${encodeURIComponent(
    sourceId
  )}?locale=${encodeURIComponent(locale)}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error(`Failed to fetch credibility: ${r.status}`);
  const body = await r.json();
  return body.data as CredibilityResult;
}

/**
 * TanStack Query hook for `GET /api/ai/source-credibility/:sourceId`.
 *
 * staleTime is 24h to match the server-side Redis cache TTL (D-03), so a
 * given (sourceId, locale) tuple triggers at most one inference per day even
 * across many concurrent NewsCard mounts. queryKey includes `language` so
 * locale switching invalidates the cache as expected.
 */
export function useCredibility(sourceId: string, enabled = true) {
  const language = useAppStore((s) => s.language);
  return useQuery({
    queryKey: ['credibility', sourceId, language],
    queryFn: () => fetchCredibility(sourceId, language),
    staleTime: 24 * 60 * 60 * 1000, // 24h matches server cache TTL per D-03
    enabled: enabled && !!sourceId,
    retry: 1,
  });
}
