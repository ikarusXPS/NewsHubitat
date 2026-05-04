/**
 * Shared podcast types for the Phase 40 frontend (40-04 / 40-06 consumers).
 *
 * Shapes mirror the wire formats produced by:
 *   - `apps/web/server/config/podcasts.ts`        → PodcastFeed (curated browse)
 *   - `apps/web/prisma/schema.prisma:PodcastEpisode` → PodcastEpisode (per-feed list)
 *   - `apps/web/server/services/podcastMatcherService.ts:MatchedEpisode`
 *                                                   → MatchedEpisode (related list)
 *
 * The "related podcasts" endpoint flattens (CandidateEpisode + score) — the
 * frontend never sees the wrapped {episode, feed} shape; it always sees the
 * flat matcher shape with `episodeTitle` / `podcastTitle` siblings.
 */

export interface PodcastFeed {
  /** Slug for curated, UUID for discovered podcasts. */
  id: string;
  title: string;
  rssUrl: string;
  region: string;
  language: string;
  category: string;
  reliability: number;
  imageUrl?: string;
  description?: string;
  /** Heuristic: publishers known to ship `<podcast:transcript>` — used by 40-06. */
  transcriptCheckHint?: 'likely-published' | 'never';
}

/**
 * Per-feed episode shape (Prisma `PodcastEpisode` row).
 *
 * `publishedAt` is a string on the wire (JSON), not a Date — Prisma serialises
 * Date columns as ISO strings via `JSON.stringify`. Consumers must parse if
 * they need a Date.
 */
export interface PodcastEpisode {
  id: string;
  podcastId: string;
  title: string;
  description: string | null;
  audioUrl: string;
  durationSec: number | null;
  publishedAt: string;
  episodeUrl?: string | null;
  imageUrl?: string | null;
  podcastGuid: string;
  /** Podcasting 2.0 <podcast:transcript> URL (consumed by 40-06). */
  transcriptUrl?: string | null;
  transcriptType?: string | null;
}

/**
 * "Related podcast episodes" wire shape — flat per matcher contract.
 * `score` is the deterministic ranking signal (entities + topics + recency
 * + popularity), not user-facing.
 */
export interface MatchedEpisode {
  /** Stable id (curated row id, Podcast Index id, or hash for iTunes results). */
  id: string;
  podcastGuid: string | null;
  podcastTitle: string;
  episodeTitle: string;
  description: string;
  audioUrl: string;
  /** ISO timestamp string on the wire. */
  publishedAt: string;
  durationSec?: number;
  imageUrl?: string;
  transcriptUrl?: string;
  transcriptType?: string;
  subscribers?: number;
  /** Deterministic ranking score. */
  score: number;
}
