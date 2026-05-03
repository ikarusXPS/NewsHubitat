/**
 * factCheckReadService — Postgres FTS read layer for fact-check evidence.
 *
 * Phase 38 plan 02 — uses NewsArticle.search_tsv (the GIN-indexed tsvector
 * column created in Plan 38-01) plus websearch_to_tsquery('simple', ...) to
 * pull ranked evidence rows for a user-supplied claim.
 *
 * Critical safety properties:
 *   - websearch_to_tsquery (NOT to_tsquery) handles raw user input safely
 *     — RESEARCH.md Pitfall 3: to_tsquery would crash on arbitrary punctuation
 *     and is not safe for un-validated input.
 *   - 'simple' Postgres FTS config (NOT english/german/french) per D-12 — the
 *     index was built with 'simple' so the search query MUST match.
 *   - $queryRaw with template-literal parameter binding (the safe API; the
 *     unsafe string-interpolation variant is intentionally NOT used here).
 *     Prisma binds ${claim}, ${ageDays}, ${limit} as parameterized values, so
 *     this is SQL-injection-safe.
 *   - Errors are caught + logged + return [] (mirrors newsReadService pattern).
 *     Never throws to callers.
 *
 * IMPORTANT — column-name binding: NewsArticle.searchTsv in Prisma maps to the
 * Postgres column `search_tsv` (snake_case) via @map. Raw SQL uses `search_tsv`.
 */

import { prisma } from '../db/prisma';
import logger from '../utils/logger';

export interface ClaimEvidenceRow {
  id: string;
  title: string;
  rank: number;
}

/**
 * Search the news corpus for evidence matching a free-form claim.
 *
 * Returns up to {limit} articles published within the last {ageDays} days,
 * ranked by ts_rank against the search_tsv tsvector. Empty result on Prisma
 * error or no matches.
 *
 * @param claim - free-form user input; not pre-escaped (websearch_to_tsquery handles it)
 * @param limit - max rows to return (default 10)
 * @param ageDays - article age window in days (default 90)
 */
export async function searchClaimEvidence(
  claim: string,
  limit = 10,
  ageDays = 90,
): Promise<ClaimEvidenceRow[]> {
  try {
    return await prisma.$queryRaw<ClaimEvidenceRow[]>`
      SELECT id, title,
             ts_rank(search_tsv, websearch_to_tsquery('simple', ${claim})) AS rank
      FROM "NewsArticle"
      WHERE search_tsv @@ websearch_to_tsquery('simple', ${claim})
        AND "publishedAt" > NOW() - (${ageDays} || ' days')::INTERVAL
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
  } catch (err) {
    logger.error('factCheckReadService.searchClaimEvidence failed:', err);
    return [];
  }
}

/**
 * Merge per-language FTS result arrays into a single ranked list, deduping
 * by article id and keeping the maximum rank seen for each id (RESEARCH.md
 * Pitfall 4 / D-12 cross-language search). Result is sorted DESC by rank.
 *
 * Used by aiService.factCheckClaim to combine the de/en/fr search results
 * before passing the top-N evidence to the LLM verdict prompt.
 */
export function mergeAndDedup(
  ...resultArrays: ClaimEvidenceRow[][]
): ClaimEvidenceRow[] {
  const byId = new Map<string, ClaimEvidenceRow>();
  for (const arr of resultArrays) {
    for (const row of arr) {
      const existing = byId.get(row.id);
      if (!existing || row.rank > existing.rank) {
        byId.set(row.id, row);
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.rank - a.rank);
}
