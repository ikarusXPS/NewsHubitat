import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  AlertCircle,
  RefreshCw,
  MapPin,
  Filter,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Zap,
  Shield,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { TimelineEvent } from '../types';

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; color: string; min: number; max: number }> = {
  critical: { label: 'Kritisch', color: '#ff0044', min: 8, max: 10 },
  high: { label: 'Hoch', color: '#ff6600', min: 6, max: 7 },
  medium: { label: 'Mittel', color: '#ffee00', min: 4, max: 5 },
  low: { label: 'Gering', color: '#00ff88', min: 1, max: 3 },
};

interface EventsResponse {
  success: boolean;
  data: TimelineEvent[];
  meta: {
    total: number;
    categories: Record<string, number>;
  };
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string; glowColor: string }> = {
  military: { label: 'Militar', color: '#ff0044', bgColor: 'bg-[#ff0044]/10', glowColor: '0 0 10px #ff0044' },
  diplomacy: { label: 'Diplomatie', color: '#00f0ff', bgColor: 'bg-[#00f0ff]/10', glowColor: '0 0 10px #00f0ff' },
  humanitarian: { label: 'Humanitar', color: '#00ff88', bgColor: 'bg-[#00ff88]/10', glowColor: '0 0 10px #00ff88' },
  protest: { label: 'Protest', color: '#ffee00', bgColor: 'bg-[#ffee00]/10', glowColor: '0 0 10px #ffee00' },
  other: { label: 'Sonstiges', color: '#888888', bgColor: 'bg-gray-500/10', glowColor: '0 0 10px #888888' },
};

async function fetchEvents(category?: string): Promise<EventsResponse> {
  const url = category
    ? `/api/events?category=${category}&limit=50`
    : '/api/events?limit=50';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
}

function formatDate(dateStr: string | Date): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SeverityIndicator({ severity }: { severity: number }) {
  const getSeverityColor = (sev: number) => {
    if (sev >= 8) return '#ff0044'; // Critical red
    if (sev >= 5) return '#ffee00'; // Yellow
    return '#00ff88'; // Green
  };

  const color = getSeverityColor(severity);
  const bars = [];
  for (let i = 1; i <= 10; i++) {
    bars.push(
      <div
        key={i}
        className={cn(
          'h-2 w-1 rounded-sm transition-all',
          i <= severity ? '' : 'bg-gray-800'
        )}
        style={i <= severity ? {
          backgroundColor: color,
          boxShadow: `0 0 4px ${color}`
        } : {}}
      />
    );
  }
  return (
    <div className="flex gap-0.5" title={`Schweregrad: ${severity}/10`}>
      {bars}
    </div>
  );
}

function SkeletonEventCard() {
  return (
    <div className="relative">
      {/* Timeline dot skeleton */}
      <div className="absolute -left-8 mt-2 h-4 w-4 rounded-full bg-[#00f0ff]/30 animate-pulse" />

      {/* Card skeleton - Cyber styled */}
      <div className="glass-panel rounded-lg border border-[#00f0ff]/20 p-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-700/50 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-700/50 rounded animate-pulse" />
        </div>

        {/* Title skeleton */}
        <div className="h-6 w-3/4 bg-gray-700/50 rounded mb-2 animate-pulse" />

        {/* Description skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-4 w-full bg-gray-700/50 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-gray-700/50 rounded animate-pulse" />
        </div>

        {/* Footer skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-0.5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-2 w-1 rounded-sm bg-gray-700/50 animate-pulse" />
              ))}
            </div>
            <div className="h-4 w-16 bg-gray-700/50 rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-gray-700/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

interface EventCardProps {
  event: TimelineEvent;
  onSelect: (event: TimelineEvent) => void;
}

function EventCard({ event, onSelect }: EventCardProps) {
  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.other;

  return (
    <div className="relative">
      {/* Timeline dot - Cyber styled */}
      <div
        className="absolute -left-8 mt-2 h-4 w-4 rounded-full border-2 border-[#0a0e1a]"
        style={{
          backgroundColor: config.color,
          boxShadow: config.glowColor
        }}
      />

      {/* Card - Cyber glass panel */}
      <button
        onClick={() => onSelect(event)}
        className="w-full text-left glass-panel rounded-lg border border-[#00f0ff]/20 p-4 hover:border-[#00f0ff]/40 transition-all cursor-pointer group"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="flex items-center gap-1 text-gray-500 font-mono">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">{formatDate(event.date)}</span>
          </div>
          <span
            className={cn('rounded px-2 py-0.5 text-xs font-mono font-bold uppercase border', config.bgColor)}
            style={{
              color: config.color,
              borderColor: `${config.color}40`
            }}
          >
            {config.label}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-[#00f0ff]/70 font-mono">
              <MapPin className="h-3 w-3" />
              {event.location.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-mono font-medium text-white mb-2 group-hover:text-[#00f0ff] transition-colors">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-sm font-mono text-gray-400 mb-3 line-clamp-2">
          {event.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SeverityIndicator severity={event.severity} />
            <span className="text-xs font-mono text-gray-500">
              {event.sources.length} {event.sources.length === 1 ? 'Quelle' : 'Quellen'}
            </span>
          </div>
          {event.relatedArticles.length > 0 && (
            <span className="text-xs font-mono text-[#00f0ff] group-hover:underline">
              {event.relatedArticles.length} Artikel →
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

// Article Preview Component (EVT-01, D-01, D-02, D-03)
interface ArticlePreviewProps {
  article: {
    id: string;
    title: string;
    source: { name: string };
    publishedAt: string;
    perspective: string;
    url: string;
  };
}

function ArticlePreview({ article }: ArticlePreviewProps) {
  // Format time ago for article timestamp
  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Gerade';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-mono text-gray-300 group-hover:text-[#00f0ff] truncate transition-colors">
          {article.title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-500">
          <span>{article.source.name}</span>
          <span>|</span>
          <span>{formatTimeAgo(article.publishedAt)}</span>
          <span>|</span>
          <span className="uppercase">{article.perspective}</span>
        </div>
      </div>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 text-gray-500 hover:text-[#00f0ff] transition-colors flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
        aria-label="Open article in new tab"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}

// Event Detail Panel Component
function EventDetailPanel({
  event,
  onClose,
}: {
  event: TimelineEvent;
  onClose: () => void;
}) {
  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.other;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0a0e1a] border-l border-[#00f0ff]/20 shadow-2xl shadow-[#00f0ff]/10 z-50 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-[#0a0e1a] border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn('rounded px-2 py-0.5 text-xs font-mono font-bold uppercase border', config.bgColor)}
              style={{
                color: config.color,
                borderColor: `${config.color}40`
              }}
            >
              {config.label}
            </span>
            <span className="text-xs font-mono text-gray-500">
              {formatDate(event.date)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Title & Severity */}
        <div>
          <h2 className="text-xl font-mono font-bold text-white mb-3">{event.title}</h2>
          <div className="flex items-center gap-4">
            <SeverityIndicator severity={event.severity} />
            <span className="text-sm font-mono text-gray-400">
              Schweregrad: {event.severity}/10
            </span>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-[#00f0ff]">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-mono">{event.location.name}</span>
          </div>
        )}

        {/* Description */}
        <div>
          <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
            Beschreibung
          </h3>
          <p className="text-sm font-mono text-gray-300 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Sources */}
        {event.sources.length > 0 && (
          <div>
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              Quellen ({event.sources.length})
            </h3>
            <div className="space-y-2">
              {event.sources.map((source, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50"
                >
                  <span className="text-sm font-mono text-gray-300">{source}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Articles */}
        {event.relatedArticles.length > 0 && (
          <div>
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
              Verwandte Artikel ({event.relatedArticles.length})
            </h3>
            <div className="space-y-2">
              {event.relatedArticles.map((articleId, i) => (
                <a
                  key={articleId}
                  href={`/article/${articleId}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group"
                >
                  <span className="text-sm font-mono text-gray-300 group-hover:text-[#00f0ff] transition-colors">
                    Artikel #{i + 1}
                  </span>
                  <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-[#00f0ff] transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Timeline() {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<SeverityLevel>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['events'],
    queryFn: () => fetchEvents(),
    staleTime: 2 * 60 * 1000,
  });

  // Toggle category selection (multi-select)
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Toggle severity selection (multi-select)
  const toggleSeverity = (severity: SeverityLevel) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  };

  // Navigate date
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (direction === 'next' ? 1 : -1));
      return next;
    });
  };

  // Filter and group events
  const { filteredEvents, eventsByDate, totalCounts } = useMemo(() => {
    if (!data?.data) return { filteredEvents: [], eventsByDate: {}, totalCounts: data?.meta.categories || {} };

    // Filter by category and severity
    const filtered = data.data.filter((event) => {
      const categoryMatch =
        selectedCategories.size === 0 || selectedCategories.has(event.category);
      const severityMatch =
        selectedSeverities.size === 0 ||
        Array.from(selectedSeverities).some((sev) => {
          const config = SEVERITY_CONFIG[sev];
          return event.severity >= config.min && event.severity <= config.max;
        });
      return categoryMatch && severityMatch;
    });

    // Group by date
    const byDate = filtered.reduce(
      (acc, event) => {
        const dateKey = new Date(event.date).toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
      },
      {} as Record<string, TimelineEvent[]>
    );

    return {
      filteredEvents: filtered,
      eventsByDate: byDate,
      totalCounts: data.meta.categories,
    };
  }, [data, selectedCategories, selectedSeverities]);

  const sortedDates = Object.keys(eventsByDate).sort((a, b) => b.localeCompare(a));

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Ereignis-Timeline</h1>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
          <p className="text-gray-400">Fehler beim Laden der Ereignisse</p>
          <button
            onClick={() => refetch()}
            className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          >
            <RefreshCw className="h-4 w-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono gradient-text-cyber">Ereignis-Timeline</h1>
          <p className="text-sm font-mono text-gray-500 mt-1">
            Chronologische Dokumentation aller relevanten Ereignisse
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-cyber flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Aktualisieren
        </button>
      </div>

      {/* Filters Section */}
      <div className="glass-panel rounded-xl p-4 space-y-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#00f0ff]" />
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Zeitraum
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-400" />
            </button>
            <span className="text-sm font-mono text-white px-3">
              {currentDate.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <button
              onClick={() => navigateDate('next')}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              disabled={currentDate >= new Date()}
            >
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="ml-2 px-2 py-1 rounded-lg text-xs font-mono text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors"
            >
              Heute
            </button>
          </div>
        </div>

        {/* Category Filter (Multi-select) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Kategorien
            </span>
            {selectedCategories.size > 0 && (
              <button
                onClick={() => setSelectedCategories(new Set())}
                className="text-[10px] font-mono text-[#00f0ff] hover:underline"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const isSelected = selectedCategories.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(key)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-all border',
                    isSelected
                      ? ''
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                  )}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${config.color}20`,
                          borderColor: `${config.color}50`,
                          color: config.color,
                        }
                      : {}
                  }
                >
                  {config.label}
                  <span className="ml-1.5 opacity-70">
                    ({totalCounts[key] || 0})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity Filter */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Schweregrad
            </span>
            {selectedSeverities.size > 0 && (
              <button
                onClick={() => setSelectedSeverities(new Set())}
                className="text-[10px] font-mono text-[#00f0ff] hover:underline"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(SEVERITY_CONFIG) as [SeverityLevel, typeof SEVERITY_CONFIG[SeverityLevel]][]).map(
              ([key, config]) => {
                const isSelected = selectedSeverities.has(key);
                const Icon =
                  key === 'critical'
                    ? Zap
                    : key === 'high'
                      ? AlertTriangle
                      : key === 'medium'
                        ? Shield
                        : Info;
                return (
                  <button
                    key={key}
                    onClick={() => toggleSeverity(key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-all border',
                      isSelected
                        ? ''
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                    )}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${config.color}20`,
                            borderColor: `${config.color}50`,
                            color: config.color,
                          }
                        : {}
                    }
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                    <span className="text-[10px] opacity-70">
                      ({config.min}-{config.max})
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <p className="text-xs font-mono text-gray-400">
            <span className="text-[#00f0ff] font-bold">{filteredEvents.length}</span> von{' '}
            <span className="text-white">{data?.meta.total || 0}</span> Ereignissen
          </p>
          {(selectedCategories.size > 0 || selectedSeverities.size > 0) && (
            <button
              onClick={() => {
                setSelectedCategories(new Set());
                setSelectedSeverities(new Set());
              }}
              className="text-xs font-mono text-gray-500 hover:text-white transition-colors"
            >
              Alle Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-8">
          {/* Skeleton for 3 date groups with 2-3 events each */}
          {[...Array(3)].map((_, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Header Skeleton */}
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-700" />
                <div className="h-8 w-48 bg-gray-700 rounded-full animate-pulse" />
                <div className="h-px flex-1 bg-gray-700" />
              </div>

              {/* Events Skeleton */}
              <div className="relative border-l-2 border-gray-700 pl-6 space-y-4">
                {[...Array(groupIndex === 0 ? 3 : 2)].map((_, eventIndex) => (
                  <SkeletonEventCard key={eventIndex} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : sortedDates.length > 0 ? (
        <div className="space-y-8">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-700" />
                <span className="rounded-full bg-gray-700 px-4 py-1 text-sm font-medium text-white">
                  {new Date(dateKey).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <div className="h-px flex-1 bg-gray-700" />
              </div>

              {/* Events for this date */}
              <div className="relative border-l-2 border-gray-700 pl-6 space-y-4">
                {eventsByDate[dateKey].map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSelect={setSelectedEvent}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="mb-4 h-12 w-12 text-gray-500" />
          <p className="text-gray-400">Keine Ereignisse gefunden</p>
          <p className="mt-1 text-sm text-gray-500">
            Versuche einen anderen Filter oder warte auf neue Artikel.
          </p>
        </div>
      )}

      {/* Event Detail Panel */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <EventDetailPanel
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
