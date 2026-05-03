import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale = 'de-DE'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date: Date | string, locale = 'de'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return locale === 'de' ? 'Gerade eben' : 'Just now';
  if (diffMins < 60) return locale === 'de' ? `vor ${diffMins} Min.` : `${diffMins}m ago`;
  if (diffHours < 24) return locale === 'de' ? `vor ${diffHours} Std.` : `${diffHours}h ago`;
  if (diffDays < 7) return locale === 'de' ? `vor ${diffDays} Tagen` : `${diffDays}d ago`;
  return formatDate(d, locale === 'de' ? 'de-DE' : 'en-US');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getSentimentColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-500';
    case 'negative':
      return 'text-red-500';
    case 'neutral':
      return 'text-gray-500';
  }
}

export function getRegionColor(region: string): string {
  const colors: Record<string, string> = {
    usa: 'bg-blue-500',
    europa: 'bg-purple-500',
    deutschland: 'bg-black',
    nahost: 'bg-orange-500',
    tuerkei: 'bg-red-500',
    russland: 'bg-red-600',
    china: 'bg-yellow-500',
    asien: 'bg-cyan-500',
    afrika: 'bg-lime-500',
    lateinamerika: 'bg-amber-500',
    ozeanien: 'bg-teal-500',
    kanada: 'bg-red-500',
    alternative: 'bg-green-500',
    // Phase 40 D-A2: 4 new sub-regions
    sudostasien: 'bg-teal-400',
    nordeuropa: 'bg-sky-400',
    'sub-saharan-africa': 'bg-orange-400',
    indien: 'bg-amber-600',
  };
  return colors[region] || 'bg-gray-500';
}

export function getRegionLabel(region: string): string {
  const labels: Record<string, string> = {
    usa: 'USA',
    europa: 'Europa',
    deutschland: 'Deutschland',
    nahost: 'Nahost',
    tuerkei: 'Türkei',
    russland: 'Russland',
    china: 'China',
    asien: 'Asien',
    afrika: 'Afrika',
    lateinamerika: 'Lateinamerika',
    ozeanien: 'Ozeanien',
    kanada: 'Kanada',
    alternative: 'Alternative',
    // Phase 40 D-A2: 4 new sub-regions
    sudostasien: 'Südostasien',
    nordeuropa: 'Nordeuropa',
    'sub-saharan-africa': 'Subsahara-Afrika',
    indien: 'Indien',
  };
  return labels[region] || region;
}
