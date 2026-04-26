/**
 * Locale-aware date and number formatting utilities
 * Uses date-fns for date formatting and Intl API for numbers
 * Respects i18next language setting per D-06 and D-07
 */
import { formatDistance, format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import i18n from '../i18n/i18n';

// Map i18n language codes to date-fns locales
const localeMap = {
  de: de,
  en: enUS,
} as const;

/**
 * 7-day threshold for relative vs absolute date display (Claude's discretion per CONTEXT.md)
 */
const RELATIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Format a date with hybrid relative/absolute display per D-06:
 * - Recent (< 7 days): "5 minutes ago" / "vor 5 Minuten"
 * - Older (>= 7 days): "Apr 23, 2026" / "23. Apr 2026"
 *
 * @param date - Date object or ISO string
 * @returns Formatted date string in current i18n language
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Handle invalid dates
  if (isNaN(d.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const lang = i18n.language as keyof typeof localeMap;
  const locale = localeMap[lang] || enUS;

  // Relative for recent dates
  if (diffMs >= 0 && diffMs < RELATIVE_THRESHOLD_MS) {
    return formatDistance(d, now, { addSuffix: true, locale });
  }

  // Absolute for older dates (or future dates)
  // D-06: "23. Apr 2026" (DE) / "Apr 23, 2026" (EN)
  const pattern = lang === 'de' ? 'd. MMM yyyy' : 'MMM d, yyyy';
  return format(d, pattern, { locale });
}

/**
 * Format a number according to locale per D-07:
 * - DE: 1.234,56 (period for thousands, comma for decimals)
 * - EN: 1,234.56 (comma for thousands, period for decimals)
 *
 * @param value - Number to format
 * @param options - Intl.NumberFormat options (optional)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  const lang = i18n.language;
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a percentage according to locale
 *
 * @param value - Decimal value (e.g., 0.42 for 42%)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number): string {
  return formatNumber(value, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Format a compact number (e.g., 1.2K, 3.5M)
 *
 * @param value - Number to format
 * @returns Compact formatted string
 */
export function formatCompactNumber(value: number): string {
  return formatNumber(value, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}
