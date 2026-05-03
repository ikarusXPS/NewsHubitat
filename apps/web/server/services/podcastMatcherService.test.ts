/**
 * Unit tests for podcastMatcherService (Phase 40-03 / CONT-03 / D-B2).
 *
 * rankEpisodes is pure: no IO, no time except recencyScore (which uses Date.now()).
 * We pin time so recencyScore is deterministic.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rankEpisodes, PodcastMatcherService } from './podcastMatcherService';
import type { CandidateEpisode } from './podcastMatcherService';

const NOW = new Date('2026-05-04T00:00:00Z');

function ep(overrides: Partial<CandidateEpisode> = {}): CandidateEpisode {
  return {
    id: 'fixed-id',
    podcastGuid: null,
    podcastTitle: 'Generic Cast',
    episodeTitle: 'Generic Episode',
    description: '',
    audioUrl: 'https://example.com/audio.mp3',
    publishedAt: new Date('2026-05-03T00:00:00Z'), // 1 day before NOW
    ...overrides,
  };
}

describe('rankEpisodes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns [] for empty candidate list', () => {
    expect(rankEpisodes({ entities: ['Trump'], topics: ['tariffs'] }, [])).toEqual([]);
  });

  it('entity hits outweigh topic hits (10x weight vs 3x)', () => {
    const a = ep({ id: 'a', episodeTitle: 'About Trump', podcastGuid: 'A' });
    const b = ep({ id: 'b', episodeTitle: 'About tariffs', podcastGuid: 'B' });
    const ranked = rankEpisodes({ entities: ['Trump'], topics: ['tariffs'] }, [a, b]);
    expect(ranked[0].id).toBe('a');
    expect(ranked[1].id).toBe('b');
  });

  it('dedupes on podcastGuid (keeps higher-scoring)', () => {
    const lo = ep({ id: 'lo', episodeTitle: 'about Trump', podcastGuid: 'SAME' });
    const hi = ep({
      id: 'hi',
      episodeTitle: 'all about Trump and tariffs',
      description: 'tariffs explained',
      podcastGuid: 'SAME',
    });
    const ranked = rankEpisodes({ entities: ['Trump'], topics: ['tariffs'] }, [lo, hi]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('hi');
  });

  it('falls back to hash(title|episode|publishedAt) when podcastGuid is null', () => {
    const same1 = ep({
      id: 'same1',
      episodeTitle: 'Trump news',
      podcastTitle: 'Cast X',
      podcastGuid: null,
      publishedAt: new Date('2026-05-01T00:00:00Z'),
    });
    const same2 = ep({
      id: 'same2',
      episodeTitle: 'Trump news',
      podcastTitle: 'Cast X',
      podcastGuid: null,
      publishedAt: new Date('2026-05-01T00:00:00Z'),
    });
    const ranked = rankEpisodes({ entities: ['Trump'], topics: [] }, [same1, same2]);
    expect(ranked).toHaveLength(1);
  });

  it('recency decay: 1-day-old beats 1-year-old (otherwise identical)', () => {
    const fresh = ep({
      id: 'fresh',
      episodeTitle: 'Trump',
      publishedAt: new Date('2026-05-03T00:00:00Z'),
      podcastGuid: 'fresh-guid',
    });
    const stale = ep({
      id: 'stale',
      episodeTitle: 'Trump',
      publishedAt: new Date('2025-05-03T00:00:00Z'),
      podcastGuid: 'stale-guid',
    });
    const ranked = rankEpisodes({ entities: ['Trump'], topics: [] }, [fresh, stale]);
    expect(ranked[0].id).toBe('fresh');
  });

  it('caps output at 5 episodes', () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      ep({ id: `e${i}`, episodeTitle: `Trump-${i}`, podcastGuid: `g${i}` }),
    );
    const ranked = rankEpisodes({ entities: ['Trump'], topics: [] }, candidates);
    expect(ranked).toHaveLength(5);
  });

  it('case-insensitive substring matching', () => {
    const cand = ep({ id: 'ci', episodeTitle: 'TRUMP TARIFFS DEAL', podcastGuid: 'ci-guid' });
    const ranked = rankEpisodes({ entities: ['trump'], topics: [] }, [cand]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('ci');
  });

  it('whitespace-only article entities never match', () => {
    const cand = ep({ id: 'ws', episodeTitle: 'about Trump', podcastGuid: 'ws-guid' });
    const ranked = rankEpisodes({ entities: ['   '], topics: [''] }, [cand]);
    expect(ranked).toHaveLength(0);
  });

  it('PodcastMatcherService singleton wrapper exposes rank() with same behavior', () => {
    const svc = PodcastMatcherService.getInstance();
    const same = PodcastMatcherService.getInstance();
    expect(svc).toBe(same);

    const cand = ep({ id: 'svc', episodeTitle: 'Trump bla', podcastGuid: 'svc-guid' });
    const ranked = svc.rank({ entities: ['Trump'], topics: [] }, [cand]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('svc');
  });
});
