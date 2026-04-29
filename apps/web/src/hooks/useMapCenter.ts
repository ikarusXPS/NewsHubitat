import { useMemo } from 'react';
import { useAppStore } from '../store';
import { calculateOptimalMapView } from '../utils/mapCentering';
import type { MapCenter } from '../types/focus';

/**
 * Hook to get the optimal map center based on active focus preset or selected regions.
 *
 * Priority:
 * 1. Active focus preset's map center (if set)
 * 2. Calculated center from selected regions in filters
 * 3. Global view fallback
 *
 * @returns MapCenter with lat, lng, zoom, and optional label
 */
export function useMapCenter(): MapCenter {
  const { activeFocusPreset, filters } = useAppStore();

  return useMemo(() => {
    // Priority 1: Use preset's map center if available
    if (activeFocusPreset?.mapCenter) {
      return activeFocusPreset.mapCenter;
    }

    // Priority 2: Calculate from selected regions
    if (filters.regions && filters.regions.length > 0) {
      return calculateOptimalMapView(filters.regions);
    }

    // Priority 3: Global view fallback
    return {
      lat: 30,
      lng: 0,
      zoom: 2,
      label: 'Global View',
    };
  }, [activeFocusPreset, filters.regions]);
}
