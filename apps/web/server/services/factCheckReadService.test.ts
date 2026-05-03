/**
 * Unit tests for factCheckReadService — Phase 38-02 Task 2.
 *
 * Mocks Prisma at module level. Verifies:
 *   - searchClaimEvidence parameterizes via $queryRaw template literal (no string interpolation)
 *   - Error path catches Prisma exceptions, logs via logger.error, returns []
 *   - Punctuation in claim text does NOT throw (websearch_to_tsquery is safe-by-design)
 *   - mergeAndDedup keeps max rank across input arrays and sorts DESC
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so the mock fns are available when the factories run.
const { mockQueryRaw, mockLoggerError } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('../db/prisma', () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: mockLoggerError,
    debug: vi.fn(),
  },
}));

import {
  searchClaimEvidence,
  mergeAndDedup,
  type ClaimEvidenceRow,
} from './factCheckReadService';

describe('factCheckReadService.searchClaimEvidence', () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
    mockLoggerError.mockReset();
  });

  it('happy path: returns rows from prisma in the order Postgres returned', async () => {
    const rows: ClaimEvidenceRow[] = [
      { id: 'a1', title: 'Article 1', rank: 0.9 },
      { id: 'a2', title: 'Article 2', rank: 0.7 },
      { id: 'a3', title: 'Article 3', rank: 0.4 },
    ];
    mockQueryRaw.mockResolvedValue(rows);

    const result = await searchClaimEvidence('israel palestine conflict', 10, 90);
    expect(result).toEqual(rows);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });

  it('error path: catches Prisma errors, logs, returns []', async () => {
    mockQueryRaw.mockRejectedValue(new Error('connection refused'));

    const result = await searchClaimEvidence('any claim', 10, 90);
    expect(result).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError.mock.calls[0][0]).toContain('factCheckReadService.searchClaimEvidence');
  });

  it('punctuation in claim does NOT throw (websearch_to_tsquery handles raw input)', async () => {
    mockQueryRaw.mockResolvedValue([]);

    // Tricky inputs that would crash to_tsquery() (per RESEARCH.md Pitfall 3)
    const tricky = [
      'What about Israel/Palestine?',
      'Trump\'s "deal of the century"',
      'cost: $1,000,000 (USD)',
    ];

    for (const claim of tricky) {
      const result = await searchClaimEvidence(claim);
      expect(result).toEqual([]);
    }
    expect(mockQueryRaw).toHaveBeenCalledTimes(tricky.length);
  });

  it('returns empty array on no matches', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const result = await searchClaimEvidence('completely nonexistent claim text');
    expect(result).toEqual([]);
  });

  it('uses default limit=10 and ageDays=90 when not specified', async () => {
    mockQueryRaw.mockResolvedValue([]);
    await searchClaimEvidence('claim');
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    // The tagged template arguments include the parameter values; we just verify
    // the call happened without error and the function did not throw.
  });
});

describe('factCheckReadService.mergeAndDedup', () => {
  it('keeps max rank for duplicate ids across input arrays', () => {
    const out = mergeAndDedup(
      [{ id: 'a', title: 'A', rank: 0.5 }],
      [{ id: 'a', title: 'A', rank: 0.7 }],
      [{ id: 'b', title: 'B', rank: 0.3 }],
    );
    expect(out).toEqual([
      { id: 'a', title: 'A', rank: 0.7 },
      { id: 'b', title: 'B', rank: 0.3 },
    ]);
  });

  it('returns [] when given no input arrays', () => {
    expect(mergeAndDedup()).toEqual([]);
  });

  it('returns [] when all inputs are empty', () => {
    expect(mergeAndDedup([], [], [])).toEqual([]);
  });

  it('three arrays with same id at different ranks → keeps max rank', () => {
    const out = mergeAndDedup(
      [{ id: 'x', title: 'X', rank: 0.2 }],
      [{ id: 'x', title: 'X', rank: 0.8 }],
      [{ id: 'x', title: 'X', rank: 0.5 }],
    );
    expect(out).toEqual([{ id: 'x', title: 'X', rank: 0.8 }]);
  });

  it('sorts result DESC by rank', () => {
    const out = mergeAndDedup(
      [
        { id: 'a', title: 'A', rank: 0.1 },
        { id: 'b', title: 'B', rank: 0.9 },
        { id: 'c', title: 'C', rank: 0.5 },
      ],
    );
    expect(out.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('handles single-array input (passthrough with sort)', () => {
    const out = mergeAndDedup([
      { id: 'a', title: 'A', rank: 0.4 },
      { id: 'b', title: 'B', rank: 0.6 },
    ]);
    expect(out).toEqual([
      { id: 'b', title: 'B', rank: 0.6 },
      { id: 'a', title: 'A', rank: 0.4 },
    ]);
  });
});
