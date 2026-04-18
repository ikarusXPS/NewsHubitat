import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { NewsCard } from '../components/NewsCard';
import { HistoryStats } from '../components/history/HistoryStats';
import {
  HistoryFilters as HistoryFiltersComponent,
  defaultHistoryFilters,
  type HistoryFilters as HistoryFiltersType,
} from '../components/history/HistoryFilters';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { NewsArticle, PerspectiveRegion, Sentiment } from '../types';

interface HistoryEntry {
  articleId: string;
  timestamp: number;
  readCount?: number;
}

interface TimelineGroup {
  label: string;
  labelDe: string;
  entries: HistoryEntry[];
}

async function fetchArticleById(id: string): Promise<NewsArticle | null> {
  try {
    const response = await fetch(`/api/news/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch article');
    }
    const result = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

async function fetchHistoryArticles(ids: string[]): Promise<Map<string, NewsArticle>> {
  // Limit to 100 articles max per T-06-04 threat mitigation
  const limitedIds = ids.slice(0, 100);
  const results = await Promise.allSettled(limitedIds.map(fetchArticleById));
  const map = new Map<string, NewsArticle>();
  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) {
      map.set(limitedIds[i], result.value);
    }
  });
  return map;
}

function groupByDate(entries: HistoryEntry[]): TimelineGroup[] {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const today: HistoryEntry[] = [];
  const yesterday: HistoryEntry[] = [];
  const thisWeek: HistoryEntry[] = [];
  const older: HistoryEntry[] = [];

  entries.forEach((entry) => {
    const age = now - entry.timestamp;
    if (age < DAY) today.push(entry);
    else if (age < 2 * DAY) yesterday.push(entry);
    else if (age < 7 * DAY) thisWeek.push(entry);
    else older.push(entry);
  });

  return [
    { label: 'Today', labelDe: 'Heute', entries: today },
    { label: 'Yesterday', labelDe: 'Gestern', entries: yesterday },
    { label: 'This Week', labelDe: 'Diese Woche', entries: thisWeek },
    { label: 'Older', labelDe: 'Alter', entries: older },
  ].filter((g) => g.entries.length > 0);
}

// Count read occurrences for each article
function enrichWithReadCount(
  history: { articleId: string; timestamp: number }[]
): HistoryEntry[] {
  const countMap = new Map<string, number>();
  history.forEach((entry) => {
    countMap.set(entry.articleId, (countMap.get(entry.articleId) || 0) + 1);
  });

  // Deduplicate keeping the most recent timestamp per article
  const seen = new Set<string>();
  return history
    .filter((entry) => {
      if (seen.has(entry.articleId)) return false;
      seen.add(entry.articleId);
      return true;
    })
    .map((entry) => ({
      ...entry,
      readCount: countMap.get(entry.articleId) || 1,
    }));
}

export function ReadingHistory() {
  const { readingHistory, clearReadingHistory, language } = useAppStore();
  const [filters, setFilters] = useState<HistoryFiltersType>(defaultHistoryFilters);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const enrichedHistory = useMemo(() => enrichWithReadCount(readingHistory), [readingHistory]);
  const articleIds = useMemo(() => enrichedHistory.map((e) => e.articleId), [enrichedHistory]);

  const {
    data: articlesMap,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['history-articles', articleIds],
    queryFn: () => fetchHistoryArticles(articleIds),
    enabled: articleIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Apply filters
  const filteredHistory = useMemo(() => {
    let filtered = [...enrichedHistory];

    // Date filter
    if (filters.datePreset !== 'all') {
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      const presetDays: Record<string, number> = {
        today: 1,
        yesterday: 2,
        '7d': 7,
        '30d': 30,
      };
      const days = presetDays[filters.datePreset];
      if (days) {
        filtered = filtered.filter((e) => now - e.timestamp < days * DAY);
      }
    }

    // Search, region, sentiment filters require article data
    if (articlesMap && (filters.search || filters.regions.length > 0 || filters.sentiment)) {
      filtered = filtered.filter((entry) => {
        const article = articlesMap.get(entry.articleId);
        if (!article) return false;

        // Search
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const title = (article.title + ' ' + (article.titleTranslated?.de || '')).toLowerCase();
          if (!title.includes(searchLower)) return false;
        }

        // Region
        if (
          filters.regions.length > 0 &&
          !filters.regions.includes(article.perspective as PerspectiveRegion)
        ) {
          return false;
        }

        // Sentiment
        if (filters.sentiment && article.sentiment !== (filters.sentiment as Sentiment)) {
          return false;
        }

        return true;
      });
    }

    return filtered;
  }, [enrichedHistory, filters, articlesMap]);

  const groups = useMemo(() => groupByDate(filteredHistory), [filteredHistory]);

  const handleClearHistory = () => {
    clearReadingHistory();
    setShowClearConfirm(false);
  };

  // Empty state per D-06
  if (readingHistory.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white font-mono">
          {language === 'de' ? 'Leseverlauf' : 'Reading History'}
        </h1>
        <p className="text-gray-400">
          {language === 'de' ? 'Artikel, die Sie gelesen haben.' : 'Articles you have read.'}
        </p>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="mb-4 h-16 w-16 text-gray-500" />
          <p className="text-gray-400">
            {language === 'de' ? 'Kein Leseverlauf' : 'No Reading History'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {language === 'de'
              ? 'Lesen Sie Artikel, um Ihren Verlauf aufzubauen'
              : 'Start reading articles to build your history'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white font-mono">
          {language === 'de' ? 'Leseverlauf' : 'Reading History'}
        </h1>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
          <p className="text-gray-400">
            {language === 'de'
              ? 'Verlauf konnte nicht geladen werden. Bitte aktualisieren Sie die Seite.'
              : 'Failed to load history. Please refresh the page.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">
            {language === 'de' ? 'Leseverlauf' : 'Reading History'}
          </h1>
          <p className="text-gray-400">
            {language === 'de' ? 'Artikel, die Sie gelesen haben.' : 'Articles you have read.'}
          </p>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm text-red-400 hover:bg-red-600/30"
        >
          <Trash2 className="h-4 w-4" />
          {language === 'de' ? 'Verlauf loschen' : 'Clear History'}
        </button>
      </div>

      {/* Stats */}
      {articlesMap && <HistoryStats history={enrichedHistory} articles={articlesMap} />}

      {/* Filters */}
      <HistoryFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">
                {language === 'de' ? group.labelDe : group.label}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.entries.map((entry) => {
                  const article = articlesMap?.get(entry.articleId);
                  if (!article) return null;
                  return (
                    <div key={entry.articleId} className="relative">
                      <NewsCard article={article} />
                      {/* Read count badge per D-02 */}
                      {entry.readCount && entry.readCount > 1 && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-gray-800/80 text-xs font-mono text-gray-400">
                          {entry.readCount}x
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredHistory.length === 0 && readingHistory.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              {language === 'de'
                ? 'Keine Artikel entsprechen den Filtern'
                : 'No articles match the filters'}
            </div>
          )}
        </div>
      )}

      {/* Clear Confirmation per D-62 */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title={language === 'de' ? 'Verlauf loschen?' : 'Clear Reading History?'}
        message={
          language === 'de'
            ? 'Dies entfernt Ihren gesamten Leseverlauf. Ihre Badges und Erfolge bleiben erhalten.'
            : 'This will remove all your reading history. Your badges and achievements will be preserved.'
        }
        confirmText={language === 'de' ? 'Verlauf loschen' : 'Clear History'}
        cancelText={language === 'de' ? 'Abbrechen' : 'Cancel'}
        onConfirm={handleClearHistory}
        onCancel={() => setShowClearConfirm(false)}
        variant="danger"
      />
    </div>
  );
}
