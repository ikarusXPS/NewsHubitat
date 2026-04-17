import type { PerspectiveRegion } from '../types';
import type { MapCenter } from '../types/focus';
import { REGION_GEO_METADATA } from '../config/regionMetadata';

/**
 * Calculate optimal map center and zoom for selected regions
 *
 * Algorithm:
 * - Single region: use region's center
 * - Multiple regions: calculate bounding box midpoint
 * - Empty: global view
 * - Zoom: based on geographic span
 */
export function calculateOptimalMapView(
  selectedRegions: PerspectiveRegion[]
): MapCenter {
  // Empty selection: global view
  if (selectedRegions.length === 0) {
    return { lat: 30.0, lng: 0.0, zoom: 2, label: 'Global' };
  }

  // Single region: use region center
  if (selectedRegions.length === 1) {
    const region = selectedRegions[0];
    const metadata = REGION_GEO_METADATA[region];
    return {
      ...metadata.center,
      label: region,
    };
  }

  // Multiple regions: calculate bounding box
  const bounds = calculateBoundingBox(selectedRegions);
  const center = calculateMidpoint(bounds);
  const zoom = calculateZoom(bounds);

  return {
    lat: center.lat,
    lng: center.lng,
    zoom,
    label: `${selectedRegions.length} regions`,
  };
}

/**
 * Calculate bounding box encompassing all selected regions
 */
function calculateBoundingBox(regions: PerspectiveRegion[]) {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const region of regions) {
    const bounds = REGION_GEO_METADATA[region].bounds;
    north = Math.max(north, bounds.north);
    south = Math.min(south, bounds.south);
    east = Math.max(east, bounds.east);
    west = Math.min(west, bounds.west);
  }

  return { north, south, east, west };
}

/**
 * Calculate midpoint of bounding box
 */
function calculateMidpoint(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): { lat: number; lng: number } {
  const lat = (bounds.north + bounds.south) / 2;
  let lng = (bounds.east + bounds.west) / 2;

  // Handle dateline crossing (e.g., Russia + USA)
  if (bounds.east < bounds.west) {
    lng = ((bounds.east + 360 + bounds.west) / 2) % 360;
    if (lng > 180) lng -= 360;
  }

  return { lat, lng };
}

/**
 * Calculate appropriate zoom level based on geographic span
 *
 * Zoom levels (approximate):
 * - 2: Global (>100° span)
 * - 3: Continental (50-100°)
 * - 4: Large region (25-50°)
 * - 5: Region (15-25°)
 * - 6: Small region (<15°)
 */
function calculateZoom(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): number {
  const latSpan = bounds.north - bounds.south;
  let lngSpan = bounds.east - bounds.west;

  // Handle dateline crossing
  if (lngSpan < 0) {
    lngSpan += 360;
  }

  const maxSpan = Math.max(latSpan, lngSpan);

  if (maxSpan > 100) return 2;
  if (maxSpan > 50) return 3;
  if (maxSpan > 25) return 4;
  if (maxSpan > 15) return 5;
  return 6;
}

/**
 * Check if two map centers are significantly different
 * (used to prevent unnecessary map re-centering)
 */
export function hasSignificantChange(
  prev: MapCenter | null,
  next: MapCenter
): boolean {
  if (!prev) return true;

  const latDiff = Math.abs(prev.lat - next.lat);
  const lngDiff = Math.abs(prev.lng - next.lng);
  const zoomDiff = Math.abs(prev.zoom - next.zoom);

  // Threshold: 5° lat/lng or 1 zoom level
  return latDiff > 5 || lngDiff > 5 || zoomDiff >= 1;
}
