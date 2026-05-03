/**
 * Podcast Matcher Service (Phase 40-03 / CONT-03 / D-B2).
 *
 * Pure deterministic ranking transform — no IO, no AI calls. Per the
 * <rank_formula> contract:
 *
 *   score(e, a) =
 *       10 * (# of a.entities appearing in e.title || e.description)
 *      + 3 * (# of a.topics  appearing in e.title || e.description)
 *      + 2 * recencyScore(e.publishedAt)
 *      + 1 * popularityScore(e.subscribers)
 *
 * After scoring, dedupe on `podcastGuid` (else hash(title|episode|publishedAt)),
 * keep the highest-scoring per dedupe key, sort desc by score, cap at 5.
 *
 * String matching is case-insensitive substring; whitespace-only needles never
 * produce false positives.
 */

export interface CandidateEpisode {
  id: string;
  podcastGuid: string | null;
  podcastTitle: string;
  episodeTitle: string;
  description: string;
  audioUrl: string;
  publishedAt: Date;
  durationSec?: number;
  imageUrl?: string;
  transcriptUrl?: string;
  transcriptType?: string;
  subscribers?: number;
}

export interface MatchedEpisode extends CandidateEpisode {
  score: number;
}

export interface ArticleSignals {
  entities: string[];
  topics: string[];
}

const MAX_RESULTS = 5;
const TOP_ENTITIES = 3;
const TOP_TOPICS = 2;

function recencyScore(publishedAt: Date): number {
  const ageDays = Math.max(0, (Date.now() - publishedAt.getTime()) / 86_400_000);
  // 1.0 at 0 days, ~0.5 at 30 days, ~0.1 at 365 days (per <rank_formula>)
  return Math.exp(-ageDays / 43);
}

function popularityScore(subscribers?: number): number {
  return subscribers && subscribers > 0 ? Math.log10(1 + subscribers) : 0;
}

function containsCI(haystack: string, needle: string): boolean {
  const trimmed = needle.trim().toLowerCase();
  if (trimmed.length === 0) return false;
  return haystack.toLowerCase().includes(trimmed);
}

function dedupeKey(c: CandidateEpisode): string {
  if (c.podcastGuid) return `g:${c.podcastGuid}`;
  return `h:${c.podcastTitle}|${c.episodeTitle}|${c.publishedAt.toISOString()}`;
}

export function rankEpisodes(
  article: ArticleSignals,
  candidates: CandidateEpisode[],
): MatchedEpisode[] {
  const ents = (article.entities ?? []).slice(0, TOP_ENTITIES);
  const tops = (article.topics ?? []).slice(0, TOP_TOPICS);

  const scored: MatchedEpisode[] = candidates
    .map((c) => {
      const haystack = `${c.episodeTitle} ${c.description}`;
      const eHits = ents.filter((e) => containsCI(haystack, e)).length;
      const tHits = tops.filter((t) => containsCI(haystack, t)).length;
      const score =
        10 * eHits + 3 * tHits + 2 * recencyScore(c.publishedAt) + popularityScore(c.subscribers);
      return { ...c, score };
    })
    .filter((m) => m.score > 0 && (hasAnyHit(m, ents, tops)));

  // Dedupe — keep highest-scoring per key
  const byKey = new Map<string, MatchedEpisode>();
  for (const m of scored) {
    const k = dedupeKey(m);
    const existing = byKey.get(k);
    if (!existing || m.score > existing.score) byKey.set(k, m);
  }

  return [...byKey.values()].sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
}

/**
 * Require at least one entity OR topic hit. Without this, every recent episode
 * would qualify on recencyScore alone, even when nothing matches the article.
 */
function hasAnyHit(m: MatchedEpisode, ents: string[], tops: string[]): boolean {
  const haystack = `${m.episodeTitle} ${m.description}`;
  return (
    ents.some((e) => containsCI(haystack, e)) || tops.some((t) => containsCI(haystack, t))
  );
}

/**
 * Singleton wrapper for getInstance() symmetry with the rest of the
 * 40-03 service constellation. The class is otherwise stateless.
 */
export class PodcastMatcherService {
  private static instance: PodcastMatcherService;

  private constructor() {}

  static getInstance(): PodcastMatcherService {
    if (!PodcastMatcherService.instance) {
      PodcastMatcherService.instance = new PodcastMatcherService();
    }
    return PodcastMatcherService.instance;
  }

  rank(article: ArticleSignals, candidates: CandidateEpisode[]): MatchedEpisode[] {
    return rankEpisodes(article, candidates);
  }
}
