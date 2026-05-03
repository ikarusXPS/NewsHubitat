/**
 * Unit tests for AI route coverage gap detection
 * Tests the detectCoverageGap and buildGapInstruction functions
 *
 * NOTE (Phase 38): `./ai` now imports `../services/aiService`, which transitively
 * imports `../db/prisma` (top-of-file). The prisma module throws if DATABASE_URL
 * is not set in the test env. We mock the entire AIService here so the import
 * chain stops at this file rather than reaching prisma.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/aiService', () => ({
  AIService: {
    getInstance: () => ({
      factCheckClaim: vi.fn(),
      getSourceCredibility: vi.fn(),
    }),
  },
}));

import { detectCoverageGap, buildGapInstruction } from './ai';

interface ArticleContext {
  id: string;
  title: string;
  summary: string;
  source: string;
  perspective: string;
  url: string;
}

describe('detectCoverageGap', () => {
  it('returns hasGap=true when fewer than 3 regions', () => {
    const context: ArticleContext[] = [
      { id: '1', title: 'T1', summary: 'S1', source: 'S1', perspective: 'western', url: 'u1' },
      { id: '2', title: 'T2', summary: 'S2', source: 'S2', perspective: 'western', url: 'u2' },
    ];
    const result = detectCoverageGap(context);
    expect(result.hasGap).toBe(true);
    expect(result.regionCount).toBe(1);
  });

  it('returns hasGap=false when 3+ regions present', () => {
    const context: ArticleContext[] = [
      { id: '1', title: 'T1', summary: 'S1', source: 'S1', perspective: 'western', url: 'u1' },
      { id: '2', title: 'T2', summary: 'S2', source: 'S2', perspective: 'russian', url: 'u2' },
      { id: '3', title: 'T3', summary: 'S3', source: 'S3', perspective: 'chinese', url: 'u3' },
    ];
    const result = detectCoverageGap(context);
    expect(result.hasGap).toBe(false);
    expect(result.regionCount).toBe(3);
  });

  it('returns hasGap=false for empty context', () => {
    const result = detectCoverageGap([]);
    expect(result.hasGap).toBe(false);
    expect(result.regionCount).toBe(0);
  });

  it('handles missing perspective field gracefully', () => {
    const context = [
      { id: '1', title: 'T1', summary: 'S1', source: 'S1', perspective: '', url: 'u1' },
      { id: '2', title: 'T2', summary: 'S2', source: 'S2', perspective: 'western', url: 'u2' },
    ] as ArticleContext[];
    const result = detectCoverageGap(context);
    expect(result.regionCount).toBe(1);
    expect(result.regions).toEqual(['western']);
  });
});

describe('buildGapInstruction', () => {
  it('returns instruction string when hasGap=true', () => {
    const instruction = buildGapInstruction(true, 2, ['western', 'russian']);
    expect(instruction).toContain('HINWEIS');
    expect(instruction).toContain('2 Region(en)');
    expect(instruction).toContain('western, russian');
  });

  it('returns empty string when hasGap=false', () => {
    const instruction = buildGapInstruction(false, 3, ['western', 'russian', 'chinese']);
    expect(instruction).toBe('');
  });
});
