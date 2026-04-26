import { describe, it, expect } from 'vitest';
import { calculateOptimalMapView, hasSignificantChange } from './mapCentering';
import type { PerspectiveRegion } from '../types';

describe('calculateOptimalMapView', () => {
  it('returns global view for empty region array', () => {
    const result = calculateOptimalMapView([]);

    expect(result.lat).toBe(30.0);
    expect(result.lng).toBe(0.0);
    expect(result.zoom).toBe(2);
    expect(result.label).toBe('Global');
  });

  it('returns region center for single region', () => {
    const result = calculateOptimalMapView(['deutschland']);

    expect(result.lat).toBeCloseTo(51.1657, 2);
    expect(result.lng).toBeCloseTo(10.4515, 2);
    expect(result.zoom).toBe(6);
    expect(result.label).toBe('deutschland');
  });

  it('returns USA center for USA region', () => {
    const result = calculateOptimalMapView(['usa']);

    expect(result.lat).toBeCloseTo(39.8283, 2);
    expect(result.lng).toBeCloseTo(-98.5795, 2);
    expect(result.zoom).toBe(4);
  });

  it('calculates midpoint for multiple adjacent regions', () => {
    const result = calculateOptimalMapView(['deutschland', 'europa']);

    // Should be somewhere in the Europe region (Germany + broader Europe)
    expect(result.lat).toBeGreaterThan(48);
    expect(result.lat).toBeLessThan(58); // Adjusted for Europe's northern extent
    expect(result.lng).toBeGreaterThan(5);
    expect(result.lng).toBeLessThan(25); // Adjusted for Europe's eastern extent
    expect(result.label).toBe('2 regions');
  });

  it('calculates midpoint for distant regions', () => {
    const result = calculateOptimalMapView(['usa', 'europa', 'china']);

    // Should zoom out for global view
    expect(result.zoom).toBeLessThanOrEqual(3);
    expect(result.label).toBe('3 regions');
  });

  it('handles all 13 regions correctly', () => {
    const allRegions: PerspectiveRegion[] = [
      'usa', 'kanada', 'europa', 'deutschland', 'nahost', 'tuerkei',
      'russland', 'china', 'asien', 'afrika', 'lateinamerika',
      'ozeanien', 'alternative',
    ];

    for (const region of allRegions) {
      const result = calculateOptimalMapView([region]);

      // Validate coordinates are within valid bounds
      expect(result.lat).toBeGreaterThanOrEqual(-90);
      expect(result.lat).toBeLessThanOrEqual(90);
      expect(result.lng).toBeGreaterThanOrEqual(-180);
      expect(result.lng).toBeLessThanOrEqual(180);
      expect(result.zoom).toBeGreaterThan(0);
      expect(result.zoom).toBeLessThanOrEqual(10);
    }
  });

  it('calculates appropriate zoom for small region span', () => {
    const result = calculateOptimalMapView(['tuerkei']);

    // Small region should have higher zoom
    expect(result.zoom).toBeGreaterThanOrEqual(5);
  });

  it('calculates appropriate zoom for large region span', () => {
    const result = calculateOptimalMapView(['russland']);

    // Very large region should have lower zoom
    expect(result.zoom).toBeLessThanOrEqual(4);
  });

  it('handles cross-hemisphere regions', () => {
    const result = calculateOptimalMapView(['usa', 'china']);

    // Should handle Pacific Ocean crossing
    expect(result.lat).toBeGreaterThanOrEqual(-90);
    expect(result.lat).toBeLessThanOrEqual(90);
    expect(result.lng).toBeGreaterThanOrEqual(-180);
    expect(result.lng).toBeLessThanOrEqual(180);
  });
});

describe('hasSignificantChange', () => {
  it('returns true when prev is null', () => {
    const next = { lat: 50.0, lng: 10.0, zoom: 5 };
    expect(hasSignificantChange(null, next)).toBe(true);
  });

  it('returns false for small coordinate changes', () => {
    const prev = { lat: 50.0, lng: 10.0, zoom: 5 };
    const next = { lat: 52.0, lng: 12.0, zoom: 5 };

    // 2° change is below 5° threshold
    expect(hasSignificantChange(prev, next)).toBe(false);
  });

  it('returns true for significant latitude change', () => {
    const prev = { lat: 50.0, lng: 10.0, zoom: 5 };
    const next = { lat: 60.0, lng: 10.0, zoom: 5 };

    // 10° latitude change exceeds threshold
    expect(hasSignificantChange(prev, next)).toBe(true);
  });

  it('returns true for significant longitude change', () => {
    const prev = { lat: 50.0, lng: 10.0, zoom: 5 };
    const next = { lat: 50.0, lng: 25.0, zoom: 5 };

    // 15° longitude change exceeds threshold
    expect(hasSignificantChange(prev, next)).toBe(true);
  });

  it('returns true for zoom level change', () => {
    const prev = { lat: 50.0, lng: 10.0, zoom: 5 };
    const next = { lat: 50.0, lng: 10.0, zoom: 3 };

    // 2 zoom level change exceeds threshold
    expect(hasSignificantChange(prev, next)).toBe(true);
  });

  it('returns false when all changes are within threshold', () => {
    const prev = { lat: 50.0, lng: 10.0, zoom: 5 };
    const next = { lat: 51.0, lng: 11.0, zoom: 5 };

    // 1° change in both coordinates, no zoom change
    expect(hasSignificantChange(prev, next)).toBe(false);
  });
});
