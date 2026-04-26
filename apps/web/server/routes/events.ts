import { Router, Request, Response } from 'express';
import type { NewsAggregator } from '../services/newsAggregator';
import { EventsService } from '../services/eventsService';
import { NEWS_SOURCES } from '../config/sources';
import type { PerspectiveRegion, TimelineEvent, EventCategory, EventSeverity } from '../../src/types';
import {
  getHistoricalEvents,
  getHistoricalEventsByDateRange,
  getHistoricalEventsByCategory,
  getCriticalHistoricalEvents,
  searchHistoricalEvents,
} from '../data/historicalEvents';

export const eventsRoutes = Router();

const eventsService = EventsService.getInstance();

// Calculate perspectives based on source regions
function calculatePerspectives(sourceIds: string[]): PerspectiveRegion[] {
  const regions = sourceIds
    .map(id => NEWS_SOURCES.find(s => s.id === id)?.region)
    .filter((region): region is PerspectiveRegion => region !== undefined);

  // Return unique regions
  return [...new Set(regions)];
}

// Calculate confidence score based on event properties
function calculateConfidence(event: TimelineEvent): number {
  let confidence = 0.5; // Base confidence

  // Location data increases confidence
  if (event.location) {
    confidence += 0.2;
  }

  // Multiple sources increase confidence
  if (event.sources.length >= 3) {
    confidence += 0.15;
  } else if (event.sources.length >= 2) {
    confidence += 0.1;
  }

  // Categorized events are more confident than 'other'
  if (event.category !== 'other') {
    confidence += 0.15;
  }

  return Math.min(confidence, 1.0);
}

// Get timeline events extracted from articles
eventsRoutes.get('/', (req: Request, res: Response) => {
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;
  const category = req.query.category as string | undefined;
  const limit = parseInt(req.query.limit as string) || 30;

  const { articles } = aggregator.getArticles({ limit: 500 });
  let events = eventsService.extractEventsFromArticles(articles);

  // Filter by category if specified
  if (category && ['military', 'diplomacy', 'humanitarian', 'protest', 'other'].includes(category)) {
    events = events.filter((e) => e.category === category);
  }

  // Apply limit
  events = events.slice(0, limit);

  // Cache for 2 minutes - events update frequently
  res.set('Cache-Control', 'public, max-age=120');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: events,
    meta: {
      total: events.length,
      categories: {
        military: events.filter((e) => e.category === 'military').length,
        diplomacy: events.filter((e) => e.category === 'diplomacy').length,
        humanitarian: events.filter((e) => e.category === 'humanitarian').length,
        protest: events.filter((e) => e.category === 'protest').length,
        other: events.filter((e) => e.category === 'other').length,
      },
    },
  });
});

// Get geo-located events (for map visualization)
eventsRoutes.get('/geo', (req: Request, res: Response) => {
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;
  const { articles } = aggregator.getArticles({ limit: 500 });
  const allEvents = eventsService.extractEventsFromArticles(articles);

  // Filter to only events with location data
  const geoEvents = allEvents
    .filter((event) => event.location !== undefined)
    .map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category as EventCategory,
      severity: (event.severity >= 8 ? 'critical' : event.severity >= 6 ? 'high' : event.severity >= 4 ? 'medium' : 'low') as EventSeverity,
      location: event.location!,
      timestamp: event.date,
      sourceArticles: event.relatedArticles,
      aiExtracted: true,
      confidence: calculateConfidence(event),
      perspectives: calculatePerspectives(event.sources),
    }));

  // Cache for 2 minutes - geo events are real-time
  res.set('Cache-Control', 'public, max-age=120');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: geoEvents,
    meta: {
      total: geoEvents.length,
      withLocation: geoEvents.length,
      totalArticles: articles.length,
    },
  });
});

// Get events summary/stats
eventsRoutes.get('/stats/summary', (req: Request, res: Response) => {
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;
  const { articles } = aggregator.getArticles({ limit: 500 });
  const events = eventsService.extractEventsFromArticles(articles);

  // Group by date
  const byDate: Record<string, number> = {};
  for (const event of events) {
    const dateKey = new Date(event.date).toISOString().split('T')[0];
    byDate[dateKey] = (byDate[dateKey] || 0) + 1;
  }

  // Calculate average severity by category
  const severityByCategory: Record<string, { total: number; count: number }> = {};
  for (const event of events) {
    if (!severityByCategory[event.category]) {
      severityByCategory[event.category] = { total: 0, count: 0 };
    }
    severityByCategory[event.category].total += event.severity;
    severityByCategory[event.category].count++;
  }

  const avgSeverity: Record<string, number> = {};
  for (const [cat, data] of Object.entries(severityByCategory)) {
    avgSeverity[cat] = Math.round((data.total / data.count) * 10) / 10;
  }

  // Most mentioned locations
  const locations: Record<string, number> = {};
  for (const event of events) {
    if (event.location?.name) {
      locations[event.location.name] = (locations[event.location.name] || 0) + 1;
    }
  }

  const topLocations = Object.entries(locations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Cache for 5 minutes - aggregated stats
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: {
      totalEvents: events.length,
      eventsByDate: byDate,
      avgSeverityByCategory: avgSeverity,
      topLocations,
    },
  });
});

// Get historical events
eventsRoutes.get('/historical', (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const startDate = req.query.start ? new Date(req.query.start as string) : null;
  const endDate = req.query.end ? new Date(req.query.end as string) : null;
  const search = req.query.search as string | undefined;
  const criticalOnly = req.query.critical === 'true';

  let events = getHistoricalEvents();

  // Apply filters
  if (category && ['military', 'diplomacy', 'humanitarian', 'protest', 'other'].includes(category)) {
    events = getHistoricalEventsByCategory(category as EventCategory);
  }

  if (startDate && endDate) {
    events = getHistoricalEventsByDateRange(startDate, endDate);
  }

  if (search) {
    events = searchHistoricalEvents(search);
  }

  if (criticalOnly) {
    events = getCriticalHistoricalEvents();
  }

  // Cache for 1 hour - historical data rarely changes
  res.set('Cache-Control', 'public, max-age=3600');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: events,
    meta: {
      total: events.length,
      isHistorical: true,
    },
  });
});

// Get timeline with both historical and current events
eventsRoutes.get('/timeline', (req: Request, res: Response) => {
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;
  const startDate = req.query.start ? new Date(req.query.start as string) : null;
  const endDate = req.query.end ? new Date(req.query.end as string) : null;
  const includeHistorical = req.query.historical !== 'false'; // Include by default
  const limit = parseInt(req.query.limit as string) || 50;

  // Get current events from articles
  const { articles } = aggregator.getArticles({ limit: 500 });
  let currentEvents = eventsService.extractEventsFromArticles(articles);

  // Get historical events
  let historicalEvents = includeHistorical ? getHistoricalEvents() : [];

  // Apply date filter if provided
  if (startDate && endDate) {
    currentEvents = currentEvents.filter((e) => {
      const eventDate = new Date(e.date);
      return eventDate >= startDate && eventDate <= endDate;
    });

    if (includeHistorical) {
      historicalEvents = getHistoricalEventsByDateRange(startDate, endDate);
    }
  }

  // Combine and sort all events by date (newest first)
  const allEvents = [...currentEvents, ...historicalEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Apply limit
  const limitedEvents = allEvents.slice(0, limit);

  // Cache for 5 minutes - combined timeline data
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: limitedEvents,
    meta: {
      total: limitedEvents.length,
      currentEvents: currentEvents.length,
      historicalEvents: includeHistorical ? historicalEvents.length : 0,
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : null,
    },
  });
});

// Get a specific event by ID
// NOTE: This route MUST be last because /:id will match any path
eventsRoutes.get('/:id', (req: Request, res: Response) => {
  const aggregator = req.app.locals.newsAggregator as NewsAggregator;
  const { articles } = aggregator.getArticles({ limit: 500 });
  const events = eventsService.extractEventsFromArticles(articles);

  const event = events.find((e) => e.id === req.params.id);

  if (!event) {
    res.status(404).json({
      success: false,
      error: 'Event not found',
    });
    return;
  }

  // Get related articles
  const relatedArticles = event.relatedArticles
    .map((id) => aggregator.getArticleById(id))
    .filter(Boolean);

  // Cache for 5 minutes - individual event with related articles
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Vary', 'Accept-Encoding');

  res.json({
    success: true,
    data: {
      ...event,
      articles: relatedArticles,
    },
  });
});
