import type { GeoEvent } from '../types';

/**
 * Global mock events for Event Map demonstration
 * Covers all 13 regions with diverse event types
 * In production, this would be replaced by AI-extracted events from news articles
 */

export const GLOBAL_MOCK_EVENTS: GeoEvent[] = [
  // USA (North America)
  {
    id: 'usa-1',
    title: 'Hurricane evacuation orders issued in Florida',
    description: 'Category 4 hurricane approaching Gulf Coast, mandatory evacuations in effect.',
    category: 'humanitarian',
    severity: 'critical',
    location: { lat: 27.95, lng: -82.45, name: 'Tampa Bay', region: 'Florida, USA' },
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
    sourceArticles: ['art-usa-1', 'art-usa-2'],
    aiExtracted: true,
    confidence: 0.94,
    perspectives: ['usa', 'kanada'],
  },
  {
    id: 'usa-2',
    title: 'Tech industry layoffs reach record levels',
    description: 'Major Silicon Valley companies announce workforce reductions affecting thousands.',
    category: 'economic',
    severity: 'medium',
    location: { lat: 37.77, lng: -122.42, name: 'San Francisco', region: 'California, USA' },
    timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
    sourceArticles: ['art-usa-3'],
    aiExtracted: true,
    confidence: 0.89,
    perspectives: ['usa'],
  },

  // Europa (European Union)
  {
    id: 'europa-1',
    title: 'EU summit on climate policy reaches agreement',
    description: 'European leaders finalize carbon reduction targets for 2030.',
    category: 'political',
    severity: 'medium',
    location: { lat: 50.85, lng: 4.35, name: 'Brussels', region: 'Belgium' },
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    sourceArticles: ['art-eu-1', 'art-eu-2', 'art-eu-3'],
    aiExtracted: true,
    confidence: 0.96,
    perspectives: ['europa', 'deutschland'],
  },
  {
    id: 'europa-2',
    title: 'Massive protests in Paris over pension reforms',
    description: 'Hundreds of thousands march against government retirement age increase.',
    category: 'protest',
    severity: 'high',
    location: { lat: 48.86, lng: 2.35, name: 'Paris', region: 'France' },
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    sourceArticles: ['art-eu-4'],
    aiExtracted: true,
    confidence: 0.91,
    perspectives: ['europa', 'alternative'],
  },

  // Deutschland (Germany)
  {
    id: 'de-1',
    title: 'German automotive industry transitions to electric',
    description: 'Major manufacturers announce end of combustion engine production by 2035.',
    category: 'economic',
    severity: 'medium',
    location: { lat: 48.78, lng: 9.18, name: 'Stuttgart', region: 'Baden-Württemberg, Germany' },
    timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
    sourceArticles: ['art-de-1', 'art-de-2'],
    aiExtracted: true,
    confidence: 0.93,
    perspectives: ['deutschland', 'europa'],
  },

  // Nahost (Middle East)
  {
    id: 'nahost-1',
    title: 'Diplomatic negotiations continue in Cairo',
    description: 'Regional powers meet for peace talks mediated by Egypt.',
    category: 'political',
    severity: 'high',
    location: { lat: 30.04, lng: 31.24, name: 'Cairo', region: 'Egypt' },
    timestamp: new Date(Date.now() - 1000 * 60 * 75), // 75 min ago
    sourceArticles: ['art-me-1', 'art-me-2', 'art-me-3'],
    aiExtracted: true,
    confidence: 0.92,
    perspectives: ['nahost', 'usa', 'tuerkei'],
  },
  {
    id: 'nahost-2',
    title: 'Humanitarian aid shipment arrives in Gaza',
    description: 'International relief convoy delivers medical supplies and food aid.',
    category: 'humanitarian',
    severity: 'high',
    location: { lat: 31.50, lng: 34.47, name: 'Gaza City', region: 'Gaza Strip' },
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    sourceArticles: ['art-me-4', 'art-me-5'],
    aiExtracted: true,
    confidence: 0.90,
    perspectives: ['nahost', 'alternative'],
  },

  // Türkei (Turkey)
  {
    id: 'tr-1',
    title: 'Earthquake preparedness drills conducted in Istanbul',
    description: 'City-wide emergency response exercises test readiness systems.',
    category: 'humanitarian',
    severity: 'low',
    location: { lat: 41.01, lng: 28.98, name: 'Istanbul', region: 'Turkey' },
    timestamp: new Date(Date.now() - 1000 * 60 * 200), // 3+ hours ago
    sourceArticles: ['art-tr-1'],
    aiExtracted: true,
    confidence: 0.87,
    perspectives: ['tuerkei'],
  },

  // Russland (Russia)
  {
    id: 'ru-1',
    title: 'Economic forum in Moscow discusses trade partnerships',
    description: 'Russian government hosts international business summit.',
    category: 'economic',
    severity: 'low',
    location: { lat: 55.76, lng: 37.62, name: 'Moscow', region: 'Russia' },
    timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4 hours ago
    sourceArticles: ['art-ru-1', 'art-ru-2'],
    aiExtracted: true,
    confidence: 0.88,
    perspectives: ['russland', 'china'],
  },
  {
    id: 'ru-2',
    title: 'Military exercises near Baltic Sea',
    description: 'Naval drills conducted in coordination with allied forces.',
    category: 'military',
    severity: 'medium',
    location: { lat: 59.93, lng: 30.36, name: 'St. Petersburg', region: 'Russia' },
    timestamp: new Date(Date.now() - 1000 * 60 * 150), // 2.5 hours ago
    sourceArticles: ['art-ru-3'],
    aiExtracted: true,
    confidence: 0.85,
    perspectives: ['russland', 'europa'],
  },

  // China
  {
    id: 'cn-1',
    title: 'Tech innovation summit showcases AI advancements',
    description: 'Major Chinese tech firms unveil new artificial intelligence technologies.',
    category: 'economic',
    severity: 'low',
    location: { lat: 31.23, lng: 121.47, name: 'Shanghai', region: 'China' },
    timestamp: new Date(Date.now() - 1000 * 60 * 300), // 5 hours ago
    sourceArticles: ['art-cn-1', 'art-cn-2'],
    aiExtracted: true,
    confidence: 0.91,
    perspectives: ['china', 'asien'],
  },
  {
    id: 'cn-2',
    title: 'Belt and Road Initiative expansion announced',
    description: 'New infrastructure projects planned across Southeast Asia.',
    category: 'economic',
    severity: 'medium',
    location: { lat: 39.90, lng: 116.40, name: 'Beijing', region: 'China' },
    timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
    sourceArticles: ['art-cn-3', 'art-cn-4'],
    aiExtracted: true,
    confidence: 0.94,
    perspectives: ['china', 'asien'],
  },

  // Asien (Asia-Pacific)
  {
    id: 'asia-1',
    title: 'Typhoon warning issued for coastal regions',
    description: 'Super typhoon approaching Philippines, evacuations underway.',
    category: 'humanitarian',
    severity: 'critical',
    location: { lat: 14.60, lng: 120.98, name: 'Manila', region: 'Philippines' },
    timestamp: new Date(Date.now() - 1000 * 60 * 50), // 50 min ago
    sourceArticles: ['art-asia-1', 'art-asia-2'],
    aiExtracted: true,
    confidence: 0.95,
    perspectives: ['asien'],
  },
  {
    id: 'asia-2',
    title: 'Trade negotiations between Japan and India progress',
    description: 'Bilateral talks advance on economic partnership agreement.',
    category: 'economic',
    severity: 'low',
    location: { lat: 35.68, lng: 139.69, name: 'Tokyo', region: 'Japan' },
    timestamp: new Date(Date.now() - 1000 * 60 * 270), // 4.5 hours ago
    sourceArticles: ['art-asia-3'],
    aiExtracted: true,
    confidence: 0.89,
    perspectives: ['asien', 'china'],
  },

  // Afrika (Africa)
  {
    id: 'af-1',
    title: 'Election monitoring begins in major African nation',
    description: 'International observers oversee democratic voting process.',
    category: 'political',
    severity: 'medium',
    location: { lat: -1.29, lng: 36.82, name: 'Nairobi', region: 'Kenya' },
    timestamp: new Date(Date.now() - 1000 * 60 * 100), // 1.7 hours ago
    sourceArticles: ['art-af-1', 'art-af-2'],
    aiExtracted: true,
    confidence: 0.90,
    perspectives: ['afrika', 'usa', 'europa'],
  },
  {
    id: 'af-2',
    title: 'Drought relief efforts intensify in Horn of Africa',
    description: 'UN agencies scale up emergency food distribution programs.',
    category: 'humanitarian',
    severity: 'critical',
    location: { lat: 9.03, lng: 38.74, name: 'Addis Ababa', region: 'Ethiopia' },
    timestamp: new Date(Date.now() - 1000 * 60 * 80), // 80 min ago
    sourceArticles: ['art-af-3', 'art-af-4'],
    aiExtracted: true,
    confidence: 0.92,
    perspectives: ['afrika', 'alternative'],
  },

  // Lateinamerika (Latin America)
  {
    id: 'latam-1',
    title: 'Economic reforms announced in major South American nation',
    description: 'Government unveils comprehensive financial restructuring plan.',
    category: 'economic',
    severity: 'high',
    location: { lat: -34.60, lng: -58.38, name: 'Buenos Aires', region: 'Argentina' },
    timestamp: new Date(Date.now() - 1000 * 60 * 130), // 2.2 hours ago
    sourceArticles: ['art-latam-1', 'art-latam-2'],
    aiExtracted: true,
    confidence: 0.88,
    perspectives: ['lateinamerika', 'usa'],
  },
  {
    id: 'latam-2',
    title: 'Amazon deforestation rates show significant decline',
    description: 'Conservation efforts yield positive environmental results.',
    category: 'humanitarian',
    severity: 'low',
    location: { lat: -15.79, lng: -47.89, name: 'Brasília', region: 'Brazil' },
    timestamp: new Date(Date.now() - 1000 * 60 * 220), // 3.7 hours ago
    sourceArticles: ['art-latam-3'],
    aiExtracted: true,
    confidence: 0.91,
    perspectives: ['lateinamerika', 'alternative'],
  },

  // Ozeanien (Oceania)
  {
    id: 'oce-1',
    title: 'Wildfires threaten communities in southeastern regions',
    description: 'Emergency services battle widespread bushfires amid heatwave.',
    category: 'humanitarian',
    severity: 'high',
    location: { lat: -33.87, lng: 151.21, name: 'Sydney', region: 'Australia' },
    timestamp: new Date(Date.now() - 1000 * 60 * 110), // 1.8 hours ago
    sourceArticles: ['art-oce-1', 'art-oce-2'],
    aiExtracted: true,
    confidence: 0.93,
    perspectives: ['ozeanien'],
  },

  // Kanada (Canada)
  {
    id: 'ca-1',
    title: 'Indigenous rights negotiations reach milestone',
    description: 'Federal government and First Nations leaders sign historic agreement.',
    category: 'political',
    severity: 'medium',
    location: { lat: 45.42, lng: -75.69, name: 'Ottawa', region: 'Canada' },
    timestamp: new Date(Date.now() - 1000 * 60 * 160), // 2.7 hours ago
    sourceArticles: ['art-ca-1', 'art-ca-2'],
    aiExtracted: true,
    confidence: 0.90,
    perspectives: ['kanada', 'usa'],
  },

  // Alternative (Independent/Alternative Media Focus)
  {
    id: 'alt-1',
    title: 'Grassroots climate movement gains momentum globally',
    description: 'Decentralized environmental activists coordinate worldwide actions.',
    category: 'protest',
    severity: 'medium',
    location: { lat: 51.51, lng: -0.13, name: 'London', region: 'United Kingdom' },
    timestamp: new Date(Date.now() - 1000 * 60 * 190), // 3.2 hours ago
    sourceArticles: ['art-alt-1', 'art-alt-2'],
    aiExtracted: true,
    confidence: 0.86,
    perspectives: ['alternative', 'europa'],
  },
];

/**
 * Global conflict points for GlobeView demonstration
 * Covers major ongoing conflicts and tensions worldwide
 * Replaces the previous Middle East-only focus
 */

export const GLOBAL_CONFLICT_POINTS = [
  // Eastern Europe
  {
    id: 'conflict-ukraine',
    lat: 50.45,
    lng: 30.52,
    name: 'Kyiv',
    intensity: 9,
    type: 'military' as const,
    description: 'Ongoing military conflict',
    articleCount: 234,
  },
  {
    id: 'conflict-donbas',
    lat: 48.02,
    lng: 37.80,
    name: 'Donbas Region',
    intensity: 8,
    type: 'military' as const,
    description: 'Active combat zone',
    articleCount: 178,
  },

  // Middle East (preserved existing points)
  {
    id: 'conflict-gaza',
    lat: 31.5,
    lng: 34.47,
    name: 'Gaza Strip',
    intensity: 10,
    type: 'military' as const,
    description: 'Active military operations',
    articleCount: 456,
  },
  {
    id: 'conflict-jerusalem',
    lat: 31.77,
    lng: 35.23,
    name: 'Jerusalem',
    intensity: 7,
    type: 'diplomatic' as const,
    description: 'Political tensions',
    articleCount: 289,
  },
  {
    id: 'conflict-lebanon',
    lat: 33.89,
    lng: 35.5,
    name: 'Beirut',
    intensity: 6,
    type: 'humanitarian' as const,
    description: 'Humanitarian crisis',
    articleCount: 134,
  },
  {
    id: 'conflict-yemen',
    lat: 15.35,
    lng: 44.21,
    name: 'Sana\'a',
    intensity: 8,
    type: 'humanitarian' as const,
    description: 'Ongoing humanitarian emergency',
    articleCount: 198,
  },

  // Asia-Pacific
  {
    id: 'conflict-taiwan',
    lat: 25.03,
    lng: 121.57,
    name: 'Taiwan Strait',
    intensity: 7,
    type: 'diplomatic' as const,
    description: 'Regional tensions',
    articleCount: 312,
  },
  {
    id: 'conflict-kashmir',
    lat: 34.08,
    lng: 74.80,
    name: 'Kashmir',
    intensity: 6,
    type: 'military' as const,
    description: 'Border disputes',
    articleCount: 145,
  },
  {
    id: 'conflict-myanmar',
    lat: 16.87,
    lng: 96.20,
    name: 'Yangon',
    intensity: 7,
    type: 'protest' as const,
    description: 'Civil unrest',
    articleCount: 167,
  },

  // Africa
  {
    id: 'conflict-sudan',
    lat: 15.59,
    lng: 32.53,
    name: 'Khartoum',
    intensity: 9,
    type: 'military' as const,
    description: 'Armed conflict',
    articleCount: 203,
  },
  {
    id: 'conflict-ethiopia',
    lat: 13.50,
    lng: 39.48,
    name: 'Tigray Region',
    intensity: 7,
    type: 'humanitarian' as const,
    description: 'Humanitarian crisis',
    articleCount: 156,
  },
  {
    id: 'conflict-sahel',
    lat: 12.65,
    lng: -8.00,
    name: 'Sahel Region',
    intensity: 6,
    type: 'military' as const,
    description: 'Security operations',
    articleCount: 112,
  },

  // Americas
  {
    id: 'conflict-venezuela',
    lat: 10.48,
    lng: -66.90,
    name: 'Caracas',
    intensity: 5,
    type: 'protest' as const,
    description: 'Political protests',
    articleCount: 98,
  },
  {
    id: 'conflict-colombia',
    lat: 4.60,
    lng: -74.08,
    name: 'Bogotá',
    intensity: 4,
    type: 'diplomatic' as const,
    description: 'Peace negotiations',
    articleCount: 87,
  },
];
