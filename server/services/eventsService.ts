import type { NewsArticle, TimelineEvent } from '../../src/types';

type EventCategory = 'military' | 'diplomacy' | 'humanitarian' | 'protest' | 'other';

interface EventExtraction {
  keywords: string[];
  category: EventCategory;
  severityBoost: number;
}

const EVENT_PATTERNS: EventExtraction[] = [
  {
    keywords: ['strike', 'attack', 'bombing', 'raid', 'offensive', 'invasion', 'missile', 'rocket', 'drone', 'airstrike', 'shelling', 'combat', 'battle', 'assault'],
    category: 'military',
    severityBoost: 2,
  },
  {
    keywords: ['ceasefire', 'negotiation', 'talks', 'summit', 'agreement', 'resolution', 'diplomat', 'peace', 'treaty', 'meeting', 'dialogue'],
    category: 'diplomacy',
    severityBoost: 1,
  },
  {
    keywords: ['aid', 'humanitarian', 'refugee', 'evacuation', 'hospital', 'relief', 'rescue', 'shelter', 'medical', 'supplies', 'food', 'water'],
    category: 'humanitarian',
    severityBoost: 1,
  },
  {
    keywords: ['protest', 'demonstration', 'march', 'rally', 'solidarity', 'unrest', 'riot'],
    category: 'protest',
    severityBoost: 0,
  },
];

// Location extraction patterns - Expanded for better coverage
const LOCATION_PATTERNS: Array<{ pattern: RegExp; lat: number; lng: number; name: string }> = [
  // Gaza Strip
  { pattern: /\bgaza\b/i, lat: 31.5, lng: 34.47, name: 'Gaza' },
  { pattern: /\brafah\b/i, lat: 31.2765, lng: 34.2458, name: 'Rafah' },
  { pattern: /\bkhan younis\b/i, lat: 31.3444, lng: 34.3027, name: 'Khan Younis' },
  { pattern: /\bjabalya\b/i, lat: 31.5314, lng: 34.4830, name: 'Jabalya' },
  { pattern: /\bdeir al-balah\b/i, lat: 31.4181, lng: 34.3518, name: 'Deir al-Balah' },

  // Israel
  { pattern: /\bjerusalem\b/i, lat: 31.7683, lng: 35.2137, name: 'Jerusalem' },
  { pattern: /\btel aviv\b/i, lat: 32.0853, lng: 34.7818, name: 'Tel Aviv' },
  { pattern: /\bhaifa\b/i, lat: 32.7940, lng: 34.9896, name: 'Haifa' },
  { pattern: /\bashkelon\b/i, lat: 31.6690, lng: 34.5663, name: 'Ashkelon' },
  { pattern: /\bashdod\b/i, lat: 31.8044, lng: 34.6553, name: 'Ashdod' },
  { pattern: /\bbeer sheba\b/i, lat: 31.2518, lng: 34.7913, name: 'Beer Sheba' },
  { pattern: /\bnetanya\b/i, lat: 32.3215, lng: 34.8532, name: 'Netanya' },

  // West Bank
  { pattern: /\bwest bank\b/i, lat: 31.9522, lng: 35.2332, name: 'West Bank' },
  { pattern: /\bramallah\b/i, lat: 31.9038, lng: 35.2034, name: 'Ramallah' },
  { pattern: /\bhebron\b/i, lat: 31.5326, lng: 35.0998, name: 'Hebron' },
  { pattern: /\bnablus\b/i, lat: 32.2211, lng: 35.2544, name: 'Nablus' },
  { pattern: /\bjenin\b/i, lat: 32.4600, lng: 35.3000, name: 'Jenin' },
  { pattern: /\bbethlehem\b/i, lat: 31.7054, lng: 35.2024, name: 'Bethlehem' },

  // Lebanon
  { pattern: /\bbeirut\b/i, lat: 33.8938, lng: 35.5018, name: 'Beirut' },
  { pattern: /\btripoli\b/i, lat: 34.4367, lng: 35.8497, name: 'Tripoli' },
  { pattern: /\bsidon\b/i, lat: 33.5593, lng: 35.3689, name: 'Sidon' },
  { pattern: /\btyre\b/i, lat: 33.2704, lng: 35.1943, name: 'Tyre' },
  { pattern: /\bsouth lebanon\b/i, lat: 33.2, lng: 35.3, name: 'South Lebanon' },

  // Syria
  { pattern: /\bdamascus\b/i, lat: 33.5138, lng: 36.2765, name: 'Damascus' },
  { pattern: /\baleppo\b/i, lat: 36.2021, lng: 37.1343, name: 'Aleppo' },
  { pattern: /\bhoms\b/i, lat: 34.7325, lng: 36.7092, name: 'Homs' },
  { pattern: /\blatakia\b/i, lat: 35.5311, lng: 35.7911, name: 'Latakia' },
  { pattern: /\bidlib\b/i, lat: 35.9283, lng: 36.6334, name: 'Idlib' },

  // Egypt
  { pattern: /\bcairo\b/i, lat: 30.0444, lng: 31.2357, name: 'Cairo' },
  { pattern: /\balexandria\b/i, lat: 31.2001, lng: 29.9187, name: 'Alexandria' },
  { pattern: /\bsinai\b/i, lat: 29.5, lng: 34.0, name: 'Sinai' },

  // Jordan
  { pattern: /\bamman\b/i, lat: 31.9454, lng: 35.9284, name: 'Amman' },

  // Qatar
  { pattern: /\bdoha\b/i, lat: 25.2854, lng: 51.5310, name: 'Doha' },

  // Iran
  { pattern: /\bteheran\b/i, lat: 35.6892, lng: 51.3890, name: 'Tehran' },
  { pattern: /\btehran\b/i, lat: 35.6892, lng: 51.3890, name: 'Tehran' },
  { pattern: /\bisrahan\b/i, lat: 32.6546, lng: 51.6680, name: 'Isfahan' },

  // Turkey
  { pattern: /\bankara\b/i, lat: 39.9334, lng: 32.8597, name: 'Ankara' },
  { pattern: /\bistanbul\b/i, lat: 41.0082, lng: 28.9784, name: 'Istanbul' },

  // Iraq
  { pattern: /\bbaghdad\b/i, lat: 33.3152, lng: 44.3661, name: 'Baghdad' },
  { pattern: /\bbasra\b/i, lat: 30.5085, lng: 47.7835, name: 'Basra' },
  { pattern: /\berbil\b/i, lat: 36.1911, lng: 44.0094, name: 'Erbil' },

  // Saudi Arabia
  { pattern: /\briyadh\b/i, lat: 24.7136, lng: 46.6753, name: 'Riyadh' },
  { pattern: /\bjeddah\b/i, lat: 21.5433, lng: 39.1728, name: 'Jeddah' },
  { pattern: /\bmecca\b/i, lat: 21.3891, lng: 39.8579, name: 'Mecca' },

  // Yemen
  { pattern: /\bsana'?a\b/i, lat: 15.3694, lng: 44.1910, name: 'Sanaa' },
  { pattern: /\baden\b/i, lat: 12.8654, lng: 45.0367, name: 'Aden' },

  // UAE
  { pattern: /\bdubai\b/i, lat: 25.2048, lng: 55.2708, name: 'Dubai' },
  { pattern: /\babu dhabi\b/i, lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi' },

  // International
  { pattern: /\bwashington\b/i, lat: 38.9072, lng: -77.0369, name: 'Washington DC' },
  { pattern: /\bnew york\b/i, lat: 40.7128, lng: -74.0060, name: 'New York' },
  { pattern: /\blondon\b/i, lat: 51.5074, lng: -0.1278, name: 'London' },
  { pattern: /\bparis\b/i, lat: 48.8566, lng: 2.3522, name: 'Paris' },
  { pattern: /\bberlin\b/i, lat: 52.5200, lng: 13.4050, name: 'Berlin' },
  { pattern: /\bmoscow\b/i, lat: 55.7558, lng: 37.6173, name: 'Moscow' },
  { pattern: /\bbeijing\b/i, lat: 39.9042, lng: 116.4074, name: 'Beijing' },
];

export class EventsService {
  private static instance: EventsService;
  private cache: { events: TimelineEvent[]; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): EventsService {
    if (!EventsService.instance) {
      EventsService.instance = new EventsService();
    }
    return EventsService.instance;
  }

  extractEventsFromArticles(articles: NewsArticle[]): TimelineEvent[] {
    // Check cache
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.events;
    }

    const eventsMap = new Map<string, TimelineEvent>();

    for (const article of articles) {
      const event = this.extractEvent(article);
      if (event) {
        // Group similar events by date and category
        const key = `${event.date.toISOString().split('T')[0]}-${event.category}-${event.location?.name || 'general'}`;

        if (eventsMap.has(key)) {
          // Merge into existing event
          const existing = eventsMap.get(key)!;
          existing.sources.push(article.source.id);
          existing.relatedArticles.push(article.id);
          // Update severity based on coverage
          existing.severity = Math.min(10, existing.severity + 0.5);
        } else {
          eventsMap.set(key, event);
        }
      }
    }

    // Sort by date (newest first) and severity
    const events = Array.from(eventsMap.values())
      .sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return b.severity - a.severity;
      })
      .slice(0, 100); // Limit to 100 events

    // Cache results
    this.cache = { events, timestamp: Date.now() };

    return events;
  }

  private extractEvent(article: NewsArticle): TimelineEvent | null {
    const text = `${article.title} ${article.content}`.toLowerCase();

    // Determine category
    let category: EventCategory = 'other';
    let severityBoost = 0;

    for (const pattern of EVENT_PATTERNS) {
      if (pattern.keywords.some(kw => text.includes(kw))) {
        category = pattern.category;
        severityBoost = pattern.severityBoost;
        break;
      }
    }

    // Extract location first
    const location = this.extractLocation(text);

    // For map visualization, prioritize articles with locations
    // Skip only if no category match AND no location AND not significant
    if (category === 'other' && !location && !this.isSignificantEvent(text)) {
      return null;
    }

    // Calculate severity based on various factors
    const severity = this.calculateSeverity(article, category, severityBoost);

    return {
      id: `event-${article.id}`,
      date: new Date(article.publishedAt),
      title: this.shortenTitle(article.title),
      description: article.summary || article.content.slice(0, 200),
      category,
      severity,
      sources: [article.source.id],
      location,
      relatedArticles: [article.id],
    };
  }

  private isSignificantEvent(text: string): boolean {
    const significantKeywords = [
      'breaking', 'urgent', 'major', 'historic', 'unprecedented',
      'killed', 'dead', 'casualties', 'explosion', 'emergency',
      'statement', 'announced', 'decision', 'vote', 'sanction',
      'conflict', 'crisis', 'tension', 'escalation', 'threat',
      'warning', 'report', 'forces', 'military', 'security'
    ];
    return significantKeywords.some(kw => text.includes(kw));
  }

  private extractLocation(text: string): { lat: number; lng: number; name: string } | undefined {
    for (const loc of LOCATION_PATTERNS) {
      if (loc.pattern.test(text)) {
        return { lat: loc.lat, lng: loc.lng, name: loc.name };
      }
    }
    return undefined;
  }

  private calculateSeverity(article: NewsArticle, category: EventCategory, boost: number): number {
    let severity = 5 + boost;

    // Adjust based on sentiment
    if (article.sentiment === 'negative') {
      severity += 1;
    }

    // Adjust based on source reliability
    if (article.source.bias.reliability >= 8) {
      severity += 0.5;
    }

    // Military events are generally more severe
    if (category === 'military') {
      severity += 1;
    }

    // Check for high-impact keywords
    const highImpactWords = ['death', 'killed', 'massacre', 'invasion', 'war'];
    const text = `${article.title} ${article.content}`.toLowerCase();
    if (highImpactWords.some(w => text.includes(w))) {
      severity += 1;
    }

    return Math.min(10, Math.max(1, Math.round(severity)));
  }

  private shortenTitle(title: string): string {
    // Remove source prefixes like "[Reuters]"
    let clean = title.replace(/^\[.*?\]\s*/, '');

    // Truncate if too long
    if (clean.length > 80) {
      clean = clean.slice(0, 77) + '...';
    }

    return clean;
  }

  getEventsByCategory(events: TimelineEvent[], category: EventCategory): TimelineEvent[] {
    return events.filter(e => e.category === category);
  }

  getEventsByDateRange(events: TimelineEvent[], start: Date, end: Date): TimelineEvent[] {
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= start && eventDate <= end;
    });
  }

  clearCache(): void {
    this.cache = null;
  }
}
