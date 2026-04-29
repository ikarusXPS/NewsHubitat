import type { FocusPreset } from '../types/focus';

/**
 * Built-in focus presets for NewsHub
 * Each preset combines regions, topics, and optimal map view
 */
export const FOCUS_PRESETS: FocusPreset[] = [
  {
    id: 'global-overview',
    name: 'Global Overview',
    description: 'All major regions and topics for comprehensive global coverage',
    icon: '🌍',
    regions: ['usa', 'europa', 'china', 'russland', 'nahost', 'asien'],
    topics: ['conflict', 'diplomacy', 'economy', 'politics', 'military'],
    mapCenter: { lat: 30.0, lng: 0.0, zoom: 2 },
    isDefault: true,
    color: '#00f0ff',
  },

  {
    id: 'europa-focus',
    name: 'Europa-Fokus',
    description: 'European affairs including Germany, Russia, and transatlantic relations',
    icon: '🇪🇺',
    regions: ['europa', 'deutschland', 'russland'],
    topics: ['politics', 'economy', 'diplomacy', 'society'],
    mapCenter: { lat: 50.0, lng: 10.0, zoom: 4 },
    color: '#0066ff',
  },

  {
    id: 'asia-pacific',
    name: 'Asien-Pazifik',
    description: 'Asia-Pacific region including China, Japan, Southeast Asia, and Australia',
    icon: '🌏',
    regions: ['asien', 'china', 'ozeanien'],
    topics: ['economy', 'diplomacy', 'conflict', 'politics'],
    mapCenter: { lat: 25.0, lng: 120.0, zoom: 3 },
    color: '#ff6600',
  },

  {
    id: 'americas',
    name: 'Americas',
    description: 'North and South America: USA, Canada, and Latin America',
    icon: '🌎',
    regions: ['usa', 'kanada', 'lateinamerika'],
    topics: ['politics', 'economy', 'society', 'diplomacy'],
    mapCenter: { lat: 20.0, lng: -95.0, zoom: 3 },
    color: '#00ff88',
  },

  {
    id: 'middle-east-turkey',
    name: 'Nahost & Türkei',
    description: 'Middle East conflicts, diplomacy, and Turkish affairs',
    icon: '🕌',
    regions: ['nahost', 'tuerkei'],
    topics: ['conflict', 'military', 'diplomacy', 'humanitarian', 'politics'],
    mapCenter: { lat: 32.0, lng: 35.0, zoom: 5 },
    color: '#ff0044',
  },

  {
    id: 'africa',
    name: 'Afrika',
    description: 'African continent: politics, economy, and humanitarian developments',
    icon: '🌍',
    regions: ['afrika'],
    topics: ['humanitarian', 'politics', 'economy', 'conflict', 'society'],
    mapCenter: { lat: 0.0, lng: 20.0, zoom: 3 },
    color: '#ffee00',
  },

  {
    id: 'russia-asia',
    name: 'Russland & Asien',
    description: 'Russia and Asian geopolitics',
    icon: '🇷🇺',
    regions: ['russland', 'asien', 'china'],
    topics: ['military', 'diplomacy', 'economy', 'politics'],
    mapCenter: { lat: 55.0, lng: 85.0, zoom: 3 },
    color: '#bf00ff',
  },
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string): FocusPreset | undefined {
  return FOCUS_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get default preset
 */
export function getDefaultPreset(): FocusPreset {
  return FOCUS_PRESETS.find((p) => p.isDefault) || FOCUS_PRESETS[0];
}

/**
 * Available topics for focus customization
 */
export const AVAILABLE_TOPICS = [
  { id: 'conflict', label: 'Konflikt', icon: '⚔️' },
  { id: 'diplomacy', label: 'Diplomatie', icon: '🤝' },
  { id: 'economy', label: 'Wirtschaft', icon: '💼' },
  { id: 'humanitarian', label: 'Humanitär', icon: '🏥' },
  { id: 'politics', label: 'Politik', icon: '🏛️' },
  { id: 'society', label: 'Gesellschaft', icon: '👥' },
  { id: 'military', label: 'Militär', icon: '🪖' },
  { id: 'protest', label: 'Protest', icon: '✊' },
  { id: 'energy', label: 'Energie', icon: '⚡' },
  { id: 'climate', label: 'Klima', icon: '🌡️' },
] as const;
