import type { PerspectiveRegion } from '../types';
import type { RegionGeoMetadata } from '../types/focus';

/**
 * Geographic metadata for all perspective regions
 * Includes map centers, bounds, and representative countries
 */
export const REGION_GEO_METADATA: Record<PerspectiveRegion, RegionGeoMetadata> = {
  usa: {
    center: { lat: 39.8283, lng: -98.5795, zoom: 4 },
    bounds: { north: 49.3844, south: 24.5210, east: -66.9346, west: -125.0 },
    countries: ['United States'],
  },

  kanada: {
    center: { lat: 56.1304, lng: -106.3468, zoom: 4 },
    bounds: { north: 83.1139, south: 41.6765, east: -52.6194, west: -141.0 },
    countries: ['Canada'],
  },

  europa: {
    center: { lat: 50.0, lng: 10.0, zoom: 4 },
    bounds: { north: 71.1854, south: 35.0, east: 40.0, west: -10.0 },
    countries: ['UK', 'France', 'Spain', 'Italy', 'Poland', 'Netherlands', 'Belgium', 'Austria', 'Switzerland', 'Greece'],
  },

  deutschland: {
    center: { lat: 51.1657, lng: 10.4515, zoom: 6 },
    bounds: { north: 55.0583, south: 47.2701, east: 15.0419, west: 5.8663 },
    countries: ['Germany'],
  },

  nahost: {
    center: { lat: 32.0, lng: 35.0, zoom: 5 },
    bounds: { north: 37.0, south: 12.0, east: 60.0, west: 34.0 },
    countries: ['Israel', 'Palestine', 'Jordan', 'Lebanon', 'Syria', 'Iraq', 'Saudi Arabia', 'UAE', 'Qatar'],
  },

  tuerkei: {
    center: { lat: 38.9637, lng: 35.2433, zoom: 6 },
    bounds: { north: 42.1066, south: 35.8155, east: 44.8176, west: 25.6678 },
    countries: ['Turkey'],
  },

  russland: {
    center: { lat: 61.5240, lng: 105.3188, zoom: 3 },
    bounds: { north: 81.8586, south: 41.1850, east: -169.0, west: 19.25 },
    countries: ['Russia'],
  },

  china: {
    center: { lat: 35.8617, lng: 104.1954, zoom: 4 },
    bounds: { north: 53.5608, south: 18.1576, east: 134.7728, west: 73.4994 },
    countries: ['China'],
  },

  asien: {
    center: { lat: 25.0, lng: 120.0, zoom: 3 },
    bounds: { north: 50.0, south: -10.0, east: 150.0, west: 60.0 },
    countries: ['Japan', 'South Korea', 'Taiwan', 'India', 'Pakistan', 'Bangladesh', 'Thailand', 'Vietnam', 'Indonesia', 'Malaysia', 'Singapore', 'Philippines'],
  },

  afrika: {
    center: { lat: 0.0, lng: 20.0, zoom: 3 },
    bounds: { north: 37.3449, south: -34.8342, east: 51.4165, west: -17.5344 },
    countries: ['Egypt', 'South Africa', 'Nigeria', 'Kenya', 'Ethiopia', 'Morocco', 'Algeria', 'Tunisia', 'Ghana', 'Uganda'],
  },

  lateinamerika: {
    center: { lat: -8.7832, lng: -55.4915, zoom: 3 },
    bounds: { north: 32.7186, south: -55.9833, east: -34.7926, west: -117.1289 },
    countries: ['Mexico', 'Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela', 'Cuba'],
  },

  ozeanien: {
    center: { lat: -25.2744, lng: 133.7751, zoom: 4 },
    bounds: { north: -10.0, south: -47.0, east: 180.0, west: 110.0 },
    countries: ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji'],
  },

  // Alternative is a media type, not a geographic region - use global view
  alternative: {
    center: { lat: 30.0, lng: 0.0, zoom: 2 },
    bounds: { north: 85.0, south: -85.0, east: 180.0, west: -180.0 },
    countries: [],
  },
};

/**
 * Get display name for a region (for UI)
 */
export const REGION_DISPLAY_NAMES: Record<PerspectiveRegion, string> = {
  usa: 'USA',
  kanada: 'Kanada',
  europa: 'Europa',
  deutschland: 'Deutschland',
  nahost: 'Naher Osten',
  tuerkei: 'Türkei',
  russland: 'Russland',
  china: 'China',
  asien: 'Asien',
  afrika: 'Afrika',
  lateinamerika: 'Lateinamerika',
  ozeanien: 'Ozeanien',
  alternative: 'Alternative Medien',
};
