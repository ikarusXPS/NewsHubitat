import { useState, useRef, Component, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Globe2,
  Map,
  Filter,
  Radio,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { TensionIndex } from '../components/TensionIndex';
import { MarketsPanel } from '../components/MarketsPanel';
import { cn } from '../lib/utils';
import type { GeoEvent, ApiResponse, EventSeverity } from '../types';

// Lazy load heavy components
import { lazy, Suspense } from 'react';
import { logger } from '../lib/logger';
const GlobeView = lazy(() => import('../components/GlobeView').then(m => ({ default: m.GlobeView })));
const EventsMapEmbed = lazy(() => import('../components/EventsMapEmbed').then(m => ({ default: m.EventsMapEmbed })));

// Error Boundary for 3D components that may crash
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ViewErrorBoundary extends Component<{ children: ReactNode; fallbackToMap: () => void }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; fallbackToMap: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Monitor view error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-[#0a0e1a]">
          <div className="text-center p-8">
            <AlertTriangle className="h-12 w-12 text-[#ff6600] mx-auto mb-4" />
            <h3 className="text-lg font-mono text-white mb-2">3D View Failed to Load</h3>
            <p className="text-sm text-gray-500 mb-4">
              {this.state.error?.message || 'WebGL may not be supported'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                this.props.fallbackToMap();
              }}
              className="btn-cyber btn-cyber-primary px-4 py-2 rounded-lg"
            >
              <Map className="h-4 w-4 inline mr-2" />
              Switch to 2D Map
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fetch geo-located events from API
async function fetchGeoEvents(): Promise<ApiResponse<GeoEvent[]>> {
  const response = await fetch('/api/events/geo');
  if (!response.ok) throw new Error('Failed to fetch geo events');
  return response.json();
}

const SEVERITY_COLORS = {
  critical: '#ff0044',
  high: '#ff6600',
  medium: '#ffee00',
  low: '#00ff88',
};

const SEVERITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function Monitor() {
  const [viewMode, setViewMode] = useState<'globe' | 'map'>('map'); // Default to map (more stable)
  const [selectedSeverity, setSelectedSeverity] = useState<EventSeverity | null>(null);
  const [focusEventId, setFocusEventId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fallback to map if globe fails
  const handleFallbackToMap = () => setViewMode('map');

  // Fetch live geo events from API
  const { data: eventsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['geo-events'], // Synchronized with EventMap
    queryFn: fetchGeoEvents,
    staleTime: 60_000, // 1 minute
    refetchInterval: 2 * 60_000, // Refresh every 2 minutes
  });

  // Get GeoEvents directly from API
  const events: GeoEvent[] = eventsData?.data ?? [];

  // Stats
  const stats = {
    total: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    high: events.filter(e => e.severity === 'high').length,
    medium: events.filter(e => e.severity === 'medium').length,
    low: events.filter(e => e.severity === 'low').length,
  };

  // Filter events
  const filteredEvents = selectedSeverity
    ? events.filter(e => e.severity === selectedSeverity)
    : events;

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
            <Radio className="h-6 w-6 text-[#00f0ff]" />
            <span className="gradient-text-cyber">THE MONITOR</span>
          </h1>
          <p className="text-sm text-gray-500 font-mono mt-1">
            Real-time geopolitical event tracking
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-4">
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('globe')}
              className={cn('view-toggle-btn', viewMode === 'globe' && 'active')}
            >
              <Globe2 className="h-3.5 w-3.5 inline mr-2" />
              3D Globe
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn('view-toggle-btn', viewMode === 'map' && 'active')}
            >
              <Map className="h-3.5 w-3.5 inline mr-2" />
              2D Map
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="btn-cyber p-2 rounded-md"
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0">
        {/* Left Panel - Stats & Filters */}
        <div className="glass-panel rounded-xl p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-180px)]">
          {/* Live Status */}
          <div className="flex items-center justify-between">
            <div className="live-indicator">
              <span className="live-dot" />
              <span>{isLoading ? 'Loading...' : 'Live Monitoring'}</span>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className={cn(
                'text-[#00f0ff]/50 hover:text-[#00f0ff] transition-colors',
                isFetching && 'animate-spin'
              )}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="stat-box py-2">
              <div className="signal-counter text-lg">{stats.total}</div>
              <div className="signal-label text-[8px]">Total</div>
            </div>
            <div className="stat-box py-2" style={{ borderColor: 'rgba(255, 0, 68, 0.3)' }}>
              <div className="signal-counter text-lg" style={{ color: '#ff0044', textShadow: '0 0 15px #ff0044' }}>
                {stats.critical}
              </div>
              <div className="signal-label text-[8px]">Critical</div>
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <div className="signal-label mb-1.5 flex items-center gap-2">
              <Filter className="h-3 w-3" />
              Severity
            </div>
            <div className="space-y-1">
              {(['critical', 'high', 'medium', 'low'] as const).map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSelectedSeverity(
                    selectedSeverity === severity ? null : severity
                  )}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all',
                    'border text-left text-[10px] font-mono uppercase',
                    selectedSeverity === severity
                      ? ''
                      : 'bg-transparent border-gray-700/50 hover:border-gray-600'
                  )}
                  style={{
                    borderColor: selectedSeverity === severity ? SEVERITY_COLORS[severity] : undefined,
                    backgroundColor: selectedSeverity === severity ? `${SEVERITY_COLORS[severity]}20` : undefined,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: SEVERITY_COLORS[severity] }}
                    />
                    <span style={{ color: selectedSeverity === severity ? SEVERITY_COLORS[severity] : '#9ca3af' }}>
                      {SEVERITY_LABELS[severity]}
                    </span>
                  </span>
                  <span style={{ color: SEVERITY_COLORS[severity] }}>
                    {stats[severity]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tension Index Widget */}
          <TensionIndex />

          {/* Markets Panel */}
          <MarketsPanel />

          {/* Recent Events in Left Panel */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="signal-label">Recent Events</div>
              <Link
                to="/event-map"
                className="text-[9px] font-mono text-[#00f0ff] hover:text-[#00f0ff]/80 flex items-center gap-0.5 transition-colors"
              >
                View All
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
              {filteredEvents.slice(0, 8).map((event) => {
                // Format time ago
                const eventTime = new Date(event.timestamp);
                // eslint-disable-next-line react-hooks/purity -- Date.now() for relative time display
                const minutesAgo = Math.floor((Date.now() - eventTime.getTime()) / 60000);
                const timeLabel = minutesAgo < 60
                  ? `${minutesAgo}m`
                  : minutesAgo < 1440
                    ? `${Math.floor(minutesAgo / 60)}h`
                    : `${Math.floor(minutesAgo / 1440)}d`;

                const isSelected = focusEventId === event.id;

                // In Globe mode, zoom to event; in Map mode, navigate to EventMap
                const handleEventClick = () => {
                  if (viewMode === 'globe') {
                    setFocusEventId(event.id);
                  }
                };

                return viewMode === 'globe' ? (
                  <button
                    key={event.id}
                    onClick={handleEventClick}
                    className={cn(
                      "w-full flex items-center justify-between p-1.5 rounded-md transition-colors cursor-pointer group text-left",
                      isSelected
                        ? "bg-[#00f0ff]/20 border border-[#00f0ff]/40"
                        : "bg-black/30 hover:bg-black/50"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: SEVERITY_COLORS[event.severity] }}
                      />
                      <span className={cn(
                        "text-[10px] font-mono truncate transition-colors",
                        isSelected ? "text-[#00f0ff]" : "text-gray-300 group-hover:text-[#00f0ff]"
                      )}>
                        {event.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-gray-500 font-mono flex-shrink-0 ml-2">
                      <Clock className="h-2.5 w-2.5" />
                      {timeLabel}
                    </div>
                  </button>
                ) : (
                  <Link
                    key={event.id}
                    to={`/event-map?event=${event.id}`}
                    className="flex items-center justify-between p-1.5 rounded-md bg-black/30 hover:bg-black/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: SEVERITY_COLORS[event.severity] }}
                      />
                      <span className="text-[10px] text-gray-300 font-mono truncate group-hover:text-[#00f0ff] transition-colors">
                        {event.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-gray-500 font-mono flex-shrink-0 ml-2">
                      <Clock className="h-2.5 w-2.5" />
                      {timeLabel}
                    </div>
                  </Link>
                );
              })}
              {filteredEvents.length === 0 && (
                <div className="text-center py-3 text-[10px] text-gray-500 font-mono">
                  No events to display
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main View - Globe or Map */}
        <div className="md:col-span-3 glass-panel rounded-xl overflow-hidden relative min-h-[600px]">
          <AnimatePresence mode="wait">
            {viewMode === 'globe' ? (
              <motion.div
                key="globe"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0"
              >
                <ViewErrorBoundary fallbackToMap={handleFallbackToMap}>
                  <Suspense
                    fallback={
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <Globe2 className="h-12 w-12 text-[#00f0ff] animate-pulse mx-auto mb-4" />
                          <p className="text-sm font-mono text-gray-500">Loading 3D Globe...</p>
                        </div>
                      </div>
                    }
                  >
                    <GlobeView
                      points={filteredEvents}
                      isLoading={isLoading}
                      focusEventId={focusEventId}
                      onPointClick={(event) => setFocusEventId(event.id)}
                    />
                  </Suspense>
                </ViewErrorBoundary>
              </motion.div>
            ) : (
              <motion.div
                key="map"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0"
              >
                <ViewErrorBoundary fallbackToMap={handleFallbackToMap}>
                  <Suspense
                    fallback={
                      <div className="h-full flex items-center justify-center bg-[#0a0e1a]">
                        <div className="text-center">
                          <Map className="h-12 w-12 text-[#00f0ff] animate-pulse mx-auto mb-4" />
                          <p className="text-sm font-mono text-gray-500">Loading 2D Map...</p>
                        </div>
                      </div>
                    }
                  >
                    <EventsMapEmbed events={filteredEvents} />
                  </Suspense>
                </ViewErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
