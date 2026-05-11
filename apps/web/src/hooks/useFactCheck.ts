import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export type Verdict = 'true' | 'mostly-true' | 'mixed' | 'unverified' | 'false';

export interface FactCheckCitation {
  articleId: string;
  title: string;
  sourceName: string;
  region: string;
  url: string;
}

/**
 * Server-side fact-check result shape (matches FactCheckResponseSchema in
 * server/openapi/schemas.ts; produced by AIService.factCheckClaim).
 */
export interface FactCheckResult {
  factCheckId: string;
  verdict: Verdict;
  /** Raw 0-100 confidence score from the LLM. */
  confidence: number;
  /** Bucketed confidence per D-05 LOCKED. */
  confidenceBucket: 'low' | 'medium' | 'high';
  methodologyMd: string;
  citations: FactCheckCitation[];
  locale: 'de' | 'en' | 'fr';
  generatedAt: string;
  cached: boolean;
}

/**
 * TanStack Mutation hook for `POST /api/ai/fact-check`.
 *
 * Error encoding (parsed by FactCheckDrawer):
 *   - 429 rate limit  → throws `RATE_LIMIT:<upgradeUrl>` (D-09)
 *   - 400 validation  → throws `VALIDATION:<server message>` (Zod / injection)
 *   - other non-OK    → throws `Fact-check failed: <status>`
 */
export function useFactCheck() {
  return useMutation({
    mutationFn: async (args: {
      claim: string;
      articleId?: string;
      language?: 'de' | 'en' | 'fr';
    }): Promise<FactCheckResult> => {
      const r = await apiFetch('/api/ai/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      if (r.status === 429) {
        const data = await r.json().catch(() => ({}));
        throw new Error(`RATE_LIMIT:${data?.upgradeUrl ?? '/pricing'}`);
      }
      if (r.status === 400) {
        const data = await r.json().catch(() => ({}));
        throw new Error(`VALIDATION:${data?.error ?? 'Invalid claim'}`);
      }
      if (!r.ok) throw new Error(`Fact-check failed: ${r.status}`);
      const body = await r.json();
      return body.data as FactCheckResult;
    },
  });
}
