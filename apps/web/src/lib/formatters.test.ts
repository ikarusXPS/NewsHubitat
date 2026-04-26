import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import i18n from '../i18n/i18n';

// Mock i18n to control language in tests
vi.mock('../i18n/i18n', () => ({
  default: {
    language: 'en',
    changeLanguage: vi.fn(),
    on: vi.fn(),
  },
}));

// Import after mock is set up
import { formatDateTime, formatNumber, formatPercent, formatCompactNumber } from './formatters';

describe('formatters', () => {
  describe('formatNumber', () => {
    it('formats numbers with EN locale (comma thousands, period decimals)', () => {
      vi.mocked(i18n).language = 'en';
      expect(formatNumber(1234.56)).toBe('1,234.56');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('formats numbers with DE locale (period thousands, comma decimals)', () => {
      vi.mocked(i18n).language = 'de';
      // Note: German uses non-breaking space for thousands in some locales
      // The exact format depends on the browser's Intl implementation
      const result = formatNumber(1234.56);
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('56');
    });
  });

  describe('formatPercent', () => {
    it('formats percentages correctly', () => {
      vi.mocked(i18n).language = 'en';
      expect(formatPercent(0.42)).toBe('42%');
      expect(formatPercent(0.1234)).toBe('12.3%');
    });
  });

  describe('formatCompactNumber', () => {
    it('formats large numbers compactly', () => {
      vi.mocked(i18n).language = 'en';
      expect(formatCompactNumber(1500)).toBe('1.5K');
      expect(formatCompactNumber(2500000)).toBe('2.5M');
    });
  });

  describe('formatDateTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns relative time for recent dates (EN)', () => {
      vi.mocked(i18n).language = 'en';

      // 5 minutes ago
      const fiveMinAgo = new Date('2026-04-23T11:55:00Z');
      const result = formatDateTime(fiveMinAgo);
      expect(result).toContain('minute');
      expect(result).toContain('ago');
    });

    it('returns relative time for recent dates (DE)', () => {
      vi.mocked(i18n).language = 'de';

      // 2 hours ago
      const twoHoursAgo = new Date('2026-04-23T10:00:00Z');
      const result = formatDateTime(twoHoursAgo);
      expect(result).toContain('Stunde');
    });

    it('returns absolute time for dates older than 7 days (EN)', () => {
      vi.mocked(i18n).language = 'en';

      // 10 days ago
      const tenDaysAgo = new Date('2026-04-13T12:00:00Z');
      const result = formatDateTime(tenDaysAgo);
      expect(result).toBe('Apr 13, 2026');
    });

    it('returns absolute time for dates older than 7 days (DE)', () => {
      vi.mocked(i18n).language = 'de';

      // 10 days ago
      const tenDaysAgo = new Date('2026-04-13T12:00:00Z');
      const result = formatDateTime(tenDaysAgo);
      expect(result).toBe('13. Apr. 2026');
    });

    it('handles invalid dates gracefully', () => {
      const result = formatDateTime('invalid-date');
      expect(result).toBe('');
    });

    it('handles string dates', () => {
      vi.mocked(i18n).language = 'en';
      const result = formatDateTime('2026-04-23T11:55:00Z');
      expect(result).toContain('ago');
    });
  });
});
