/**
 * Unit tests for utility functions
 * Demonstrates TDD patterns and factory usage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatDate,
  timeAgo,
  truncate,
  getSentimentColor,
  getRegionColor,
  getRegionLabel,
} from './utils';

describe('cn (classnames utility)', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toBe('base active');
  });

  it('merges tailwind classes correctly', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2'); // Later class wins
  });

  it('handles undefined and null', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });
});

describe('formatDate', () => {
  it('formats Date object correctly', () => {
    const date = new Date('2024-01-15T10:30:00');
    const result = formatDate(date, 'de-DE');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats string date correctly', () => {
    const result = formatDate('2024-01-15T10:30:00', 'de-DE');
    expect(result).toContain('15');
  });

  it('uses German locale by default', () => {
    const date = new Date('2024-01-15T10:30:00');
    const result = formatDate(date);
    expect(result).toContain('15');
  });
});

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Gerade eben" for less than a minute ago (German)', () => {
    const date = new Date('2024-01-15T11:59:45');
    const result = timeAgo(date, 'de');
    expect(result).toBe('Gerade eben');
  });

  it('returns "Just now" for less than a minute ago (English)', () => {
    const date = new Date('2024-01-15T11:59:45');
    const result = timeAgo(date, 'en');
    expect(result).toBe('Just now');
  });

  it('returns minutes ago correctly', () => {
    const date = new Date('2024-01-15T11:45:00');
    const result = timeAgo(date, 'de');
    expect(result).toBe('vor 15 Min.');
  });

  it('returns hours ago correctly', () => {
    const date = new Date('2024-01-15T09:00:00');
    const result = timeAgo(date, 'de');
    expect(result).toBe('vor 3 Std.');
  });

  it('returns days ago correctly', () => {
    const date = new Date('2024-01-13T12:00:00');
    const result = timeAgo(date, 'de');
    expect(result).toBe('vor 2 Tagen');
  });

  it('returns formatted date for more than 7 days', () => {
    const date = new Date('2024-01-01T12:00:00');
    const result = timeAgo(date, 'de');
    expect(result).toContain('2024');
  });
});

describe('truncate', () => {
  it('returns original string if shorter than length', () => {
    const result = truncate('Hello', 10);
    expect(result).toBe('Hello');
  });

  it('truncates string and adds ellipsis', () => {
    const result = truncate('Hello World', 5);
    expect(result).toBe('Hello...');
  });

  it('handles exact length', () => {
    const result = truncate('Hello', 5);
    expect(result).toBe('Hello');
  });

  it('handles empty string', () => {
    const result = truncate('', 5);
    expect(result).toBe('');
  });
});

describe('getSentimentColor', () => {
  it('returns green for positive sentiment', () => {
    const result = getSentimentColor('positive');
    expect(result).toBe('text-green-500');
  });

  it('returns red for negative sentiment', () => {
    const result = getSentimentColor('negative');
    expect(result).toBe('text-red-500');
  });

  it('returns gray for neutral sentiment', () => {
    const result = getSentimentColor('neutral');
    expect(result).toBe('text-gray-500');
  });
});

describe('getRegionColor', () => {
  it('returns correct color for usa region', () => {
    const result = getRegionColor('usa');
    expect(result).toBe('bg-blue-500');
  });

  it('returns correct color for nahost region', () => {
    const result = getRegionColor('nahost');
    expect(result).toBe('bg-orange-500');
  });

  it('returns correct color for tuerkei region', () => {
    const result = getRegionColor('tuerkei');
    expect(result).toBe('bg-red-500');
  });

  it('returns correct color for russland region', () => {
    const result = getRegionColor('russland');
    expect(result).toBe('bg-red-600');
  });

  it('returns correct color for china region', () => {
    const result = getRegionColor('china');
    expect(result).toBe('bg-yellow-500');
  });

  it('returns correct color for alternative region', () => {
    const result = getRegionColor('alternative');
    expect(result).toBe('bg-green-500');
  });

  it('returns gray for unknown region', () => {
    const result = getRegionColor('unknown');
    expect(result).toBe('bg-gray-500');
  });
});

describe('getRegionLabel', () => {
  it('returns correct label for usa region', () => {
    const result = getRegionLabel('usa');
    expect(result).toBe('USA');
  });

  it('returns correct label for nahost region', () => {
    const result = getRegionLabel('nahost');
    expect(result).toBe('Nahost');
  });

  it('returns the region key for unknown regions', () => {
    const result = getRegionLabel('unknown');
    expect(result).toBe('unknown');
  });
});
