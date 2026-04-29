/**
 * Unit tests for credibilityService — Phase 38-02 Task 1.
 *
 * These are pure-function tests; no mocks needed. Boundary cases for D-04
 * (-0.2 / +0.2 bias thresholds) and D-05 (60 / 80 confidence thresholds)
 * are covered explicitly per CONTEXT.md.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveCredibilityScore,
  deriveBiasBucket,
  bucketConfidence,
} from './credibilityService';
import type { NewsSource } from '../../src/types';

function makeSource(reliability: number, political: number): NewsSource {
  return {
    id: 'test-src',
    name: 'Test',
    country: 'XX',
    region: 'usa',
    language: 'en',
    bias: { political, reliability, ownership: 'private' },
  };
}

describe('credibilityService.deriveCredibilityScore', () => {
  it('reliability=9, political=0 → 63 (9 × 7, no penalty)', () => {
    expect(deriveCredibilityScore(makeSource(9, 0))).toBe(63);
  });

  it('reliability=9, political=-1 → 33 (63 - 30)', () => {
    expect(deriveCredibilityScore(makeSource(9, -1))).toBe(33);
  });

  it('reliability=0, political=0 → 0 (clamped to 0)', () => {
    expect(deriveCredibilityScore(makeSource(0, 0))).toBe(0);
  });

  it('reliability=10, political=0 → 70 (max via reliability alone)', () => {
    expect(deriveCredibilityScore(makeSource(10, 0))).toBe(70);
  });

  it('result is always integer in [0, 100]', () => {
    const s = deriveCredibilityScore(makeSource(10, 1));
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);

    const s2 = deriveCredibilityScore(makeSource(0, 1));
    expect(s2).toBe(0);

    const s3 = deriveCredibilityScore(makeSource(10, -1));
    expect(s3).toBe(40); // 70 - 30
    expect(Number.isInteger(s3)).toBe(true);
  });

  it('handles fractional reliability/political (rounds via Math.round)', () => {
    // 5.5 * 7 = 38.5; |0.3| * 30 = 9; 38.5 - 9 = 29.5 → round → 30
    expect(deriveCredibilityScore(makeSource(5.5, 0.3))).toBe(30);
  });
});

describe('credibilityService.deriveBiasBucket', () => {
  it('-0.21 → left (just below threshold)', () => {
    expect(deriveBiasBucket(-0.21)).toBe('left');
  });

  it('-0.2 → center (boundary inclusive on center)', () => {
    expect(deriveBiasBucket(-0.2)).toBe('center');
  });

  it('0.2 → center (boundary inclusive on center)', () => {
    expect(deriveBiasBucket(0.2)).toBe('center');
  });

  it('0.21 → right (just above threshold)', () => {
    expect(deriveBiasBucket(0.21)).toBe('right');
  });

  it('0 → center', () => {
    expect(deriveBiasBucket(0)).toBe('center');
  });

  it('-1 → left (extreme)', () => {
    expect(deriveBiasBucket(-1)).toBe('left');
  });

  it('1 → right (extreme)', () => {
    expect(deriveBiasBucket(1)).toBe('right');
  });
});

describe('credibilityService.bucketConfidence', () => {
  it('0 → low', () => {
    expect(bucketConfidence(0)).toBe('low');
  });

  it('59 → low (just below threshold)', () => {
    expect(bucketConfidence(59)).toBe('low');
  });

  it('60 → medium (boundary)', () => {
    expect(bucketConfidence(60)).toBe('medium');
  });

  it('79 → medium (just below threshold)', () => {
    expect(bucketConfidence(79)).toBe('medium');
  });

  it('80 → high (boundary)', () => {
    expect(bucketConfidence(80)).toBe('high');
  });

  it('100 → high', () => {
    expect(bucketConfidence(100)).toBe('high');
  });
});
