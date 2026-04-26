import type { PerspectiveRegion } from './index';

/**
 * Map center coordinates and zoom level
 */
export interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
  label?: string;
}

/**
 * Focus preset combining regions, topics, and map view
 */
export interface FocusPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  regions: PerspectiveRegion[];
  topics: string[];
  mapCenter: MapCenter;
  isDefault?: boolean;
  isCustom?: boolean;
  color?: string;
}

/**
 * AI-generated focus suggestion
 */
export interface FocusSuggestion {
  id: string;
  reason: 'tension-spike' | 'breaking-news' | 'coverage-gap' | 'trending';
  preset: FocusPreset;
  relevanceScore: number;
  triggerEvent: string;
  timestamp: Date;
}

/**
 * Geographic bounds for a region
 */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Regional geographic metadata
 */
export interface RegionGeoMetadata {
  center: MapCenter;
  bounds: GeoBounds;
  countries: string[];
}
