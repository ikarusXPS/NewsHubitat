import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEventSocket } from '../hooks/useEventSocket';
import { LiveBadge } from '../components/LiveBadge';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {
  Radio,
  AlertTriangle,
  Flame,
  Users,
  Landmark,
  TrendingUp,
  Shield,
  Filter,
  RefreshCw,
  Cpu,
  Zap,
  ExternalLink,
  Clock,
  MapPin,
  ChevronDown,
  BarChart3,
  PieChart,
  Calendar,
  X,
  Link2,
  Share2,
  Bookmark,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { GeoEvent, EventSeverity, EventCategory } from '../types';
import { useMapCenter } from '../hooks/useMapCenter';

const SEVERITY_CONFIG: Record<EventSeverity, { color: string; label: string; icon: React.ReactNode }> = {
  critical: { color: '#ff0044', label: 'Critical', icon: <AlertTriangle className="h-3 w-3" /> },
  high: { color: '#ff6600', label: 'High', icon: <Flame className="h-3 w-3" /> },
  medium: { color: '#ffee00', label: 'Medium', icon: <TrendingUp className="h-3 w-3" /> },
  low: { color: '#00ff88', label: 'Low', icon: <Shield className="h-3 w-3" /> },
};

const CATEGORY_CONFIG: Record<EventCategory, { color: string; label: string; icon: React.ReactNode }> = {
  conflict: { color: '#ff0044', label: 'Conflict', icon: <Flame className="h-4 w-4" /> },
  humanitarian: { color: '#ff6600', label: 'Humanitarian', icon: <Users className="h-4 w-4" /> },
  political: { color: '#bf00ff', label: 'Political', icon: <Landmark className="h-4 w-4" /> },
  economic: { color: '#00f0ff', label: 'Economic', icon: <TrendingUp className="h-4 w-4" /> },
  military: { color: '#ff0044', label: 'Military', icon: <Shield className="h-4 w-4" /> },
  protest: { color: '#00ff88', label: 'Protest', icon: <Users className="h-4 w-4" /> },
  diplomacy: { color: '#4a90e2', label: 'Diplomacy', icon: <Landmark className="h-4 w-4" /> },
  other: { color: '#9ca3af', label: 'Other', icon: <Radio className="h-4 w-4" /> },
};

// Severity order for determining cluster color (highest severity wins)
const SEVERITY_ORDER: EventSeverity[] = ['critical', 'high', 'medium', 'low'];

// MarkerCluster type for cluster icon creation
interface MarkerClusterLike {
  getAllChildMarkers(): L.Marker[];
}

// Create custom cluster icon based on max severity within cluster
function createClusterIcon(cluster: MarkerClusterLike): L.DivIcon {
  const childMarkers = cluster.getAllChildMarkers();
  const count = childMarkers.length;

  // Find max severity in cluster
  let maxSeverityIndex = SEVERITY_ORDER.length - 1;
  childMarkers.forEach((marker: L.Marker) => {
    const severity = (marker.options as { severity?: EventSeverity }).severity;
    if (severity) {
      const index = SEVERITY_ORDER.indexOf(severity);
      if (index !== -1 && index < maxSeverityIndex) {
        maxSeverityIndex = index;
      }
    }
  });

  const maxSeverity = SEVERITY_ORDER[maxSeverityIndex];
  const color = SEVERITY_CONFIG[maxSeverity].color;
  const hasCritical = maxSeverity === 'critical';

  // Determine size based on count
  const size = count < 10 ? 40 : count < 50 ? 50 : 60;

  return L.divIcon({
    html: `
      <div class="cluster-icon ${hasCritical ? 'cluster-pulse' : ''}" style="
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, ${color}40, ${color}20);
        border: 2px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: ${count > 99 ? '11px' : '13px'};
        font-weight: 700;
        color: ${color};
        text-shadow: 0 0 10px ${color};
        box-shadow: 0 0 15px ${color}60;
      ">
        ${count}
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

// Set map center dynamically based on active focus
function MapCenter() {
  const map = useMap();
  const mapCenter = useMapCenter();

  useEffect(() => {
    map.setView([mapCenter.lat, mapCenter.lng], mapCenter.zoom);
  }, [map, mapCenter]);

  return null;
}

// Format time ago
function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return dateObj.toLocaleDateString();
}

type TimeFilter = 'all' | '1h' | '24h' | '7d' | '30d';

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string; ms: number | null }[] = [
  { value: 'all', label: 'All Time', ms: null },
  { value: '1h', label: 'Last Hour', ms: 60 * 60 * 1000 },
  { value: '24h', label: 'Last 24h', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Last 7 Days', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: 'Last 30 Days', ms: 30 * 24 * 60 * 60 * 1000 },
];

export function EventMap() {
  const mapCenter = useMapCenter();
  const [searchParams, setSearchParams] = useSearchParams();

  // Default to showing all severity levels and categories on first load
  const [selectedSeverities, setSelectedSeverities] = useState<EventSeverity[]>(['critical', 'high', 'medium', 'low']);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>(['conflict', 'humanitarian', 'political', 'economic', 'military', 'protest', 'diplomacy', 'other']);
  const [selectedEvent, setSelectedEvent] = useState<GeoEvent | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [showEventDetails, setShowEventDetails] = useState(false);

  const queryClient = useQueryClient();

  // Fetch real events from API
  const { data: events, isLoading, error, refetch } = useQuery({
    queryKey: ['geo-events'], // Synchronized with Monitor
    queryFn: async (): Promise<GeoEvent[]> => {
      const response = await fetch('/api/events/geo');
      if (!response.ok) {
        throw new Error('Failed to fetch geo events');
      }
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 60_000, // 1 minute (same as Monitor)
    refetchInterval: 2 * 60_000, // Auto-refetch every 2 minutes (same as Monitor)
  });

  // WebSocket for real-time updates (per D-12, D-13, D-14)
  const { isConnected, newEvents, clearNewEvents, lastEventTime } = useEventSocket({
    enabled: true,
    onNewEvent: () => {
      // Invalidate query to refetch data when new event arrives
      queryClient.invalidateQueries({ queryKey: ['geo-events'] });
    },
  });

  // Handle URL params for deep linking (e.g., /event-map?event=abc123)
  // Deep linking pattern - setting state based on URL params is valid
  useEffect(() => {
    const eventId = searchParams.get('event');
    if (eventId && events) {
      const event = events.find((e) => e.id === eventId);
      if (event) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedEvent(event);
        setShowEventDetails(true);
        // Clear the param after handling
        searchParams.delete('event');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [events, searchParams, setSearchParams]);

  // Simulate AI extraction
  const handleExtract = useCallback(async () => {
    setIsExtracting(true);
    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await refetch();
    setIsExtracting(false);
  }, [refetch]);

  // Filter events - only show markers when filters are selected
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    // No filters selected = no markers shown
    if (selectedSeverities.length === 0 && selectedCategories.length === 0) {
      return [];
    }

    // eslint-disable-next-line react-hooks/purity -- Date.now() is intentionally used for time filtering within useMemo
    const now = Date.now();
    const timeFilterConfig = TIME_FILTER_OPTIONS.find((t) => t.value === timeFilter);
    const timeThreshold = timeFilterConfig?.ms ? now - timeFilterConfig.ms : null;

    return events.filter((event) => {
      // If severity filters are selected, event must match one of them
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(event.severity)) {
        return false;
      }
      // If category filters are selected, event must match one of them
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) {
        return false;
      }
      // Time filter
      if (timeThreshold) {
        const eventTime = new Date(event.timestamp).getTime();
        if (eventTime < timeThreshold) return false;
      }
      return true;
    });
  }, [events, selectedSeverities, selectedCategories, timeFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!events) return { total: 0, critical: 0, high: 0, aiExtracted: 0 };
    return {
      total: events.length,
      critical: events.filter((e) => e.severity === 'critical').length,
      high: events.filter((e) => e.severity === 'high').length,
      aiExtracted: events.filter((e) => e.aiExtracted).length,
    };
  }, [events]);

  // Analytics data
  const analytics = useMemo(() => {
    if (!filteredEvents.length) return { byCategory: {}, byRegion: {}, timeline: [] };

    // Category breakdown
    const byCategory: Record<string, number> = {};
    filteredEvents.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    });

    // Region breakdown
    const byRegion: Record<string, number> = {};
    filteredEvents.forEach((e) => {
      byRegion[e.location.region] = (byRegion[e.location.region] || 0) + 1;
    });

    // Timeline data - group by day
    const timelineMap: Record<string, number> = {};
    filteredEvents.forEach((e) => {
      const date = new Date(e.timestamp).toLocaleDateString();
      timelineMap[date] = (timelineMap[date] || 0) + 1;
    });
    const timeline = Object.entries(timelineMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { byCategory, byRegion, timeline };
  }, [filteredEvents]);

  const toggleSeverity = (severity: EventSeverity) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    );
  };

  const toggleCategory = (category: EventCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass-panel rounded-xl p-8 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-[#ff0044] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Failed to Load Events</h3>
          <p className="text-sm text-gray-400 mb-4">Unable to fetch geopolitical events data.</p>
          <button onClick={() => refetch()} className="btn-cyber btn-cyber-primary px-4 py-2 rounded-lg">
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
            <MapPin className="h-6 w-6 text-[#00f0ff]" />
            <span className="gradient-text-cyber">EVENT MAP</span>
          </h1>
          <p className="text-sm text-gray-500 font-mono mt-1">
            AI-powered real-time event extraction & geolocation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Filter Dropdown */}
          <div className="relative">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="btn-cyber px-3 py-2 rounded-lg text-xs font-mono bg-transparent appearance-none cursor-pointer pr-8"
            >
              {TIME_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#0a0e1a] text-white">
                  {option.label}
                </option>
              ))}
            </select>
            <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#00f0ff] pointer-events-none" />
          </div>

          {/* Timeline Toggle */}
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={cn(
              'btn-cyber px-3 py-2 rounded-lg flex items-center gap-2',
              showTimeline && 'bg-[#bf00ff]/20 border-[#bf00ff]'
            )}
            title="Toggle Timeline"
          >
            <Calendar className="h-4 w-4" />
          </button>

          {/* Analytics Toggle */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={cn(
              'btn-cyber px-3 py-2 rounded-lg flex items-center gap-2',
              showAnalytics && 'bg-[#ffee00]/20 border-[#ffee00]'
            )}
            title="Toggle Analytics"
          >
            <BarChart3 className="h-4 w-4" />
          </button>

          {/* AI Extract Button */}
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className={cn(
              'btn-cyber btn-cyber-primary px-4 py-2 rounded-lg flex items-center gap-2',
              isExtracting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isExtracting ? (
              <>
                <Cpu className="h-4 w-4 animate-pulse" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>AI Extract</span>
              </>
            )}
          </button>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn-cyber px-3 py-2 rounded-lg flex items-center gap-2',
              showFilters && 'bg-[#00f0ff]/20 border-[#00f0ff]'
            )}
          >
            <Filter className="h-4 w-4" />
            <ChevronDown className={cn('h-4 w-4 transition-transform', showFilters && 'rotate-180')} />
          </button>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn-cyber p-2 rounded-lg"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-panel rounded-xl overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Severity Filters */}
              <div>
                <div className="signal-label mb-2">Severity</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SEVERITY_CONFIG) as EventSeverity[]).map((severity) => {
                    const config = SEVERITY_CONFIG[severity];
                    const isSelected = selectedSeverities.includes(severity);
                    return (
                      <button
                        key={severity}
                        onClick={() => toggleSeverity(severity)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider border transition-all',
                          isSelected ? 'text-white' : 'text-gray-500 border-gray-700 hover:border-gray-600'
                        )}
                        style={{
                          backgroundColor: isSelected ? `${config.color}20` : 'transparent',
                          borderColor: isSelected ? config.color : undefined,
                          color: isSelected ? config.color : undefined,
                        }}
                      >
                        {config.icon}
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Filters */}
              <div>
                <div className="signal-label mb-2">Category</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((category) => {
                    const config = CATEGORY_CONFIG[category];
                    const isSelected = selectedCategories.includes(category);
                    return (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider border transition-all',
                          isSelected ? 'text-white' : 'text-gray-500 border-gray-700 hover:border-gray-600'
                        )}
                        style={{
                          backgroundColor: isSelected ? `${config.color}20` : 'transparent',
                          borderColor: isSelected ? config.color : undefined,
                          color: isSelected ? config.color : undefined,
                        }}
                      >
                        {config.icon}
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Timeline */}
      <AnimatePresence>
        {showTimeline && analytics.timeline.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-panel rounded-xl p-4"
          >
            <div className="signal-label mb-3 flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Event Timeline
            </div>
            <div className="flex items-end gap-1 h-16">
              {analytics.timeline.map((item) => {
                const maxCount = Math.max(...analytics.timeline.map((t) => t.count));
                const height = (item.count / maxCount) * 100;
                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t transition-all hover:bg-[#00f0ff]/40 cursor-pointer"
                      style={{
                        height: `${height}%`,
                        backgroundColor: '#00f0ff',
                        opacity: 0.6,
                        minHeight: item.count > 0 ? '4px' : '0',
                      }}
                      title={`${item.date}: ${item.count} events`}
                    />
                    <span className="text-[8px] font-mono text-gray-600 rotate-45 origin-left">
                      {new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-panel rounded-xl p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Breakdown */}
              <div>
                <div className="signal-label mb-3 flex items-center gap-2">
                  <PieChart className="h-3 w-3" />
                  Category Distribution
                </div>
                <div className="space-y-2">
                  {Object.entries(analytics.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => {
                      const config = CATEGORY_CONFIG[category as EventCategory];
                      const percentage = (count / filteredEvents.length) * 100;
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="flex items-center gap-1.5">
                              {config?.icon}
                              <span className="text-gray-400">{config?.label || category}</span>
                            </span>
                            <span className="text-[#00f0ff]">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="h-1 bg-gray-800/50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: config?.color || '#00f0ff',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Region Breakdown */}
              <div>
                <div className="signal-label mb-3 flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  Regional Distribution
                </div>
                <div className="space-y-2">
                  {Object.entries(analytics.byRegion)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([region, count]) => {
                      const percentage = (count / filteredEvents.length) * 100;
                      return (
                        <div key={region} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-gray-400">{region}</span>
                            <span className="text-[#00ff88]">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="h-1 bg-gray-800/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#00ff88] rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="stat-box">
          <div className="signal-counter text-lg">{stats.total}</div>
          <div className="signal-label text-[8px]">Total Events</div>
        </div>
        <div className="stat-box" style={{ borderColor: 'rgba(255, 0, 68, 0.3)' }}>
          <div className="signal-counter text-lg" style={{ color: '#ff0044', textShadow: '0 0 15px #ff0044' }}>
            {stats.critical}
          </div>
          <div className="signal-label text-[8px]">Critical</div>
        </div>
        <div className="stat-box" style={{ borderColor: 'rgba(255, 102, 0, 0.3)' }}>
          <div className="signal-counter text-lg" style={{ color: '#ff6600', textShadow: '0 0 15px #ff6600' }}>
            {stats.high}
          </div>
          <div className="signal-label text-[8px]">High Priority</div>
        </div>
        <div className="stat-box" style={{ borderColor: 'rgba(0, 240, 255, 0.3)' }}>
          <div className="signal-counter text-lg flex items-center justify-center gap-1">
            <Cpu className="h-3 w-3 text-[#00f0ff]" />
            {stats.aiExtracted}
          </div>
          <div className="signal-label text-[8px]">AI Extracted</div>
        </div>
      </div>

      {/* WebSocket Connection Status */}
      <div className="absolute bottom-4 left-4 z-10">
        <LiveBadge isConnected={isConnected} />
      </div>

      {/* Map */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Event List */}
        <div className="glass-panel rounded-xl p-4 overflow-y-auto max-h-[500px] lg:max-h-full">
          <div className="signal-label mb-3 flex items-center justify-between">
            <span>Recent Events</span>
            <span className="text-[#00f0ff]">{filteredEvents.length}</span>
          </div>
          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <Filter className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-xs text-gray-500 font-mono">
                  {selectedSeverities.length === 0 && selectedCategories.length === 0
                    ? 'Select filters to view events'
                    : 'No events match selected filters'}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const severityConfig = SEVERITY_CONFIG[event.severity];
                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowEventDetails(true);
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      selectedEvent?.id === event.id
                        ? 'bg-[rgba(0,240,255,0.1)] border-[#00f0ff]/50'
                        : 'bg-black/20 border-gray-700/50 hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className="badge-severity text-[9px]"
                        style={{
                          backgroundColor: `${severityConfig.color}20`,
                          color: severityConfig.color,
                          borderColor: `${severityConfig.color}50`,
                        }}
                      >
                        {severityConfig.icon}
                        {severityConfig.label}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </div>
                    <h4 className="text-xs font-medium text-white line-clamp-2 mb-1">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[9px] text-gray-500">
                      <MapPin className="h-2.5 w-2.5" />
                      {event.location.name}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 glass-panel rounded-xl overflow-hidden relative h-[600px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Radio className="h-10 w-10 text-[#00f0ff] mx-auto mb-4 animate-pulse" />
                <p className="text-sm font-mono text-[#00f0ff]/50 uppercase tracking-widest">
                  Loading events...
                </p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={mapCenter.zoom}
              style={{ height: '100%', width: '100%' }}
              className="z-0 leaflet-cyber"
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              />
              <MapCenter />

              {/* Event Markers with Clustering */}
              <MarkerClusterGroup
                iconCreateFunction={createClusterIcon}
                maxClusterRadius={60}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
                disableClusteringAtZoom={12}
              >
                {filteredEvents.map((event) => {
                  const severityConfig = SEVERITY_CONFIG[event.severity];
                  const categoryConfig = CATEGORY_CONFIG[event.category];
                  const isSelected = selectedEvent?.id === event.id;
                  const radius = event.severity === 'critical' ? 15 : event.severity === 'high' ? 12 : 10;

                  // Check if event is recent (< 30 minutes)
                  const eventTime = new Date(event.timestamp).getTime();
                  // eslint-disable-next-line react-hooks/purity -- Date.now() for time-based styling
                  const isRecent = Date.now() - eventTime < 30 * 60 * 1000;

                  return (
                    <CircleMarker
                      key={event.id}
                      center={[event.location.lat, event.location.lng]}
                      radius={isSelected ? radius + 3 : radius}
                      pathOptions={{
                        color: severityConfig.color,
                        fillColor: severityConfig.color,
                        fillOpacity: isSelected ? 0.6 : 0.4,
                        weight: isSelected ? 3 : 2,
                        className: cn(
                          event.severity === 'critical' && 'marker-pulse',
                          isRecent && 'marker-recent-pulse'
                        ),
                      }}
                      eventHandlers={{
                        click: () => {
                          setSelectedEvent(event);
                          setShowEventDetails(true);
                        },
                      }}
                      // @ts-expect-error - Custom property for cluster icon
                      severity={event.severity}
                    >
                      <Popup className="cyber-popup">
                        <div className="min-w-[250px] font-mono">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
                            <span
                              className="badge-severity text-[9px]"
                              style={{
                                backgroundColor: `${severityConfig.color}20`,
                                color: severityConfig.color,
                                borderColor: `${severityConfig.color}50`,
                              }}
                            >
                              {severityConfig.icon}
                              {severityConfig.label}
                            </span>
                            <span
                              className="text-[9px] px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: `${categoryConfig.color}20`,
                                color: categoryConfig.color,
                              }}
                            >
                              {categoryConfig.label}
                            </span>
                          </div>

                          <h4 className="text-sm font-medium text-white mb-2">{event.title}</h4>
                          <p className="text-xs text-gray-400 mb-3">{event.description}</p>

                          <div className="space-y-1 text-[10px] text-gray-500">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-[#00f0ff]" />
                              {event.location.name}, {event.location.region}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-[#00f0ff]" />
                              {formatTimeAgo(event.timestamp)}
                              {isRecent && (
                                <span className="text-[#00f0ff] font-bold animate-pulse">• LIVE</span>
                              )}
                            </div>
                            {event.aiExtracted && (
                              <div className="flex items-center gap-2">
                                <Cpu className="h-3 w-3 text-[#00ff88]" />
                                <span className="text-[#00ff88]">
                                  AI Extracted ({Math.round(event.confidence * 100)}% confidence)
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-3 w-3" />
                              {event.sourceArticles.length} source articles
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MarkerClusterGroup>
            </MapContainer>
          )}

          {/* No Filters Selected Overlay */}
          {!isLoading && !isExtracting && selectedSeverities.length === 0 && selectedCategories.length === 0 && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center">
              <div className="glass-panel rounded-xl p-8 text-center max-w-md">
                <Filter className="h-12 w-12 text-[#00f0ff] mx-auto mb-4" />
                <p className="text-lg font-mono text-white mb-2">No Filters Selected</p>
                <p className="text-sm text-gray-400 mb-4">
                  Select severity or category filters to display events on the map
                </p>
                <button
                  onClick={() => setShowFilters(true)}
                  className="btn-cyber btn-cyber-primary px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
                >
                  <Filter className="h-4 w-4" />
                  Open Filters
                </button>
              </div>
            </div>
          )}

          {/* AI Extraction Overlay */}
          {isExtracting && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center">
              <div className="glass-panel rounded-xl p-6 text-center">
                <Cpu className="h-12 w-12 text-[#00f0ff] mx-auto mb-4 animate-pulse" />
                <p className="text-sm font-mono text-white mb-2">AI Event Extraction</p>
                <p className="text-xs text-gray-500">
                  Analyzing news articles for geopolitical events...
                </p>
                <div className="mt-4 flex justify-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#00f0ff] animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-[#00f0ff] animate-bounce [animation-delay:0.1s]" />
                  <span className="h-2 w-2 rounded-full bg-[#00f0ff] animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Details Drawer */}
      <AnimatePresence>
        {showEventDetails && selectedEvent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEventDetails(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000]"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] glass-panel border-l border-[#00f0ff]/30 z-[2001] overflow-y-auto"
            >
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    <Radio className="h-5 w-5 text-[#00f0ff]" />
                    Event Details
                  </h3>
                  <button
                    onClick={() => setShowEventDetails(false)}
                    className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {/* Severity & Category Badges */}
                <div className="flex items-center gap-2">
                  <span
                    className="badge-severity"
                    style={{
                      backgroundColor: `${SEVERITY_CONFIG[selectedEvent.severity].color}20`,
                      color: SEVERITY_CONFIG[selectedEvent.severity].color,
                      borderColor: `${SEVERITY_CONFIG[selectedEvent.severity].color}50`,
                    }}
                  >
                    {SEVERITY_CONFIG[selectedEvent.severity].icon}
                    {SEVERITY_CONFIG[selectedEvent.severity].label}
                  </span>
                  <span
                    className="px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider border"
                    style={{
                      backgroundColor: `${CATEGORY_CONFIG[selectedEvent.category].color}20`,
                      color: CATEGORY_CONFIG[selectedEvent.category].color,
                      borderColor: `${CATEGORY_CONFIG[selectedEvent.category].color}50`,
                    }}
                  >
                    {CATEGORY_CONFIG[selectedEvent.category].icon}
                    {CATEGORY_CONFIG[selectedEvent.category].label}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-xl font-semibold text-white leading-tight">
                  {selectedEvent.title}
                </h4>

                {/* Description */}
                <p className="text-sm text-gray-400 leading-relaxed">
                  {selectedEvent.description}
                </p>

                {/* Metadata */}
                <div className="glass-panel rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-[#00f0ff]" />
                    <span className="text-gray-400">{selectedEvent.location.name}, {selectedEvent.location.region}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-[#00f0ff]" />
                    <span className="text-gray-400">{formatTimeAgo(selectedEvent.timestamp)}</span>
                  </div>
                  {selectedEvent.aiExtracted && (
                    <div className="flex items-center gap-2 text-sm">
                      <Cpu className="h-4 w-4 text-[#00ff88]" />
                      <span className="text-[#00ff88]">
                        AI Extracted ({Math.round(selectedEvent.confidence * 100)}% confidence)
                      </span>
                    </div>
                  )}
                  {selectedEvent.perspectives && selectedEvent.perspectives.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Link2 className="h-4 w-4 text-[#bf00ff]" />
                        <span className="text-gray-400">
                          Perspectives: {selectedEvent.perspectives.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedEvent.perspectives.map((perspective) => (
                          <span
                            key={perspective}
                            className="px-2 py-0.5 rounded bg-[#bf00ff]/10 border border-[#bf00ff]/30 text-[9px] font-mono text-[#bf00ff] uppercase"
                          >
                            {perspective}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Source Articles */}
                {selectedEvent.sourceArticles && selectedEvent.sourceArticles.length > 0 && (
                  <div>
                    <div className="signal-label mb-3 flex items-center gap-2">
                      <ExternalLink className="h-3 w-3" />
                      Source Articles ({selectedEvent.sourceArticles.length})
                    </div>
                    <div className="space-y-2">
                      {selectedEvent.sourceArticles.map((articleId, index) => (
                        <div
                          key={articleId}
                          className="glass-panel rounded-lg p-3 hover:bg-gray-800/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-gray-400">
                              Article #{index + 1}
                            </span>
                            <ExternalLink className="h-3 w-3 text-[#00f0ff]" />
                          </div>
                          <span className="text-[9px] font-mono text-gray-600">{articleId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + `/event-map?event=${selectedEvent.id}`);
                    }}
                    className="flex-1 btn-cyber py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs"
                    title="Copy link to event"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <button
                    className="flex-1 btn-cyber py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs"
                    title="Bookmark event"
                  >
                    <Bookmark className="h-4 w-4" />
                    Bookmark
                  </button>
                </div>

                {/* Coordinates (for debugging/advanced users) */}
                <details className="glass-panel rounded-lg p-3">
                  <summary className="text-[10px] font-mono text-gray-500 uppercase cursor-pointer">
                    Technical Details
                  </summary>
                  <div className="mt-2 space-y-1 text-[10px] font-mono text-gray-600">
                    <div>ID: {selectedEvent.id}</div>
                    <div>Lat: {selectedEvent.location.lat.toFixed(6)}</div>
                    <div>Lng: {selectedEvent.location.lng.toFixed(6)}</div>
                    <div>Timestamp: {new Date(selectedEvent.timestamp).toISOString()}</div>
                  </div>
                </details>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
