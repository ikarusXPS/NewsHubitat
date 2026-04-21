import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the store
vi.mock('../store', () => ({
  useAppStore: vi.fn(),
}));

// Mock the mapCentering utility
vi.mock('../utils/mapCentering', () => ({
  calculateOptimalMapView: vi.fn(),
}));

import { useMapCenter } from './useMapCenter';
import { useAppStore } from '../store';
import { calculateOptimalMapView } from '../utils/mapCentering';

const mockUseAppStore = useAppStore as unknown as ReturnType<typeof vi.fn>;
const mockCalculateOptimalMapView = calculateOptimalMapView as unknown as ReturnType<typeof vi.fn>;

describe('useMapCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default store state
    mockUseAppStore.mockReturnValue({
      activeFocusPreset: null,
      filters: { regions: [] },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Priority 1: preset mapCenter', () => {
    it('returns preset mapCenter when activeFocusPreset has mapCenter', () => {
      const presetMapCenter = {
        lat: 50,
        lng: 10,
        zoom: 5,
        label: 'Custom Preset',
      };

      mockUseAppStore.mockReturnValue({
        activeFocusPreset: {
          id: 'preset-1',
          name: 'Test Preset',
          mapCenter: presetMapCenter,
          regions: ['western'],
          topics: [],
        },
        filters: { regions: ['western'] },
      });

      const { result } = renderHook(() => useMapCenter());

      expect(result.current).toEqual(presetMapCenter);
      expect(mockCalculateOptimalMapView).not.toHaveBeenCalled();
    });

    it('ignores preset if mapCenter is undefined', () => {
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: {
          id: 'preset-1',
          name: 'Test Preset',
          regions: ['western'],
          topics: [],
          // No mapCenter property
        },
        filters: { regions: ['western'] },
      });

      const calculatedCenter = {
        lat: 45,
        lng: -50,
        zoom: 3,
        label: 'western',
      };
      mockCalculateOptimalMapView.mockReturnValue(calculatedCenter);

      const { result } = renderHook(() => useMapCenter());

      expect(mockCalculateOptimalMapView).toHaveBeenCalledWith(['western']);
      expect(result.current).toEqual(calculatedCenter);
    });
  });

  describe('Priority 2: calculated from regions', () => {
    it('calculates center from filter regions when no preset', () => {
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: null,
        filters: { regions: ['western', 'middle-east'] },
      });

      const calculatedCenter = {
        lat: 45,
        lng: -50,
        zoom: 3,
        label: '2 regions',
      };
      mockCalculateOptimalMapView.mockReturnValue(calculatedCenter);

      const { result } = renderHook(() => useMapCenter());

      expect(mockCalculateOptimalMapView).toHaveBeenCalledWith(['western', 'middle-east']);
      expect(result.current).toEqual(calculatedCenter);
    });

    it('calculates center for single region', () => {
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: null,
        filters: { regions: ['russian'] },
      });

      const calculatedCenter = {
        lat: 55,
        lng: 60,
        zoom: 4,
        label: 'russian',
      };
      mockCalculateOptimalMapView.mockReturnValue(calculatedCenter);

      const { result } = renderHook(() => useMapCenter());

      expect(mockCalculateOptimalMapView).toHaveBeenCalledWith(['russian']);
      expect(result.current).toEqual(calculatedCenter);
    });
  });

  describe('Priority 3: global fallback', () => {
    it('returns global view when no preset and no regions', () => {
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: null,
        filters: { regions: [] },
      });

      const { result } = renderHook(() => useMapCenter());

      expect(result.current).toEqual({
        lat: 30,
        lng: 0,
        zoom: 2,
        label: 'Global View',
      });
      expect(mockCalculateOptimalMapView).not.toHaveBeenCalled();
    });

    it('returns global view when preset exists but has no mapCenter and no regions', () => {
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: {
          id: 'preset-1',
          name: 'Empty Preset',
          regions: [],
          topics: [],
          // No mapCenter
        },
        filters: { regions: [] },
      });

      const { result } = renderHook(() => useMapCenter());

      expect(result.current).toEqual({
        lat: 30,
        lng: 0,
        zoom: 2,
        label: 'Global View',
      });
      expect(mockCalculateOptimalMapView).not.toHaveBeenCalled();
    });

    it('returns global view when regions is undefined', () => {
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: null,
        filters: { regions: undefined },
      });

      const { result } = renderHook(() => useMapCenter());

      expect(result.current).toEqual({
        lat: 30,
        lng: 0,
        zoom: 2,
        label: 'Global View',
      });
      expect(mockCalculateOptimalMapView).not.toHaveBeenCalled();
    });
  });

  describe('memoization', () => {
    it('returns same reference when inputs unchanged', () => {
      const storeState = {
        activeFocusPreset: null,
        filters: { regions: [] },
      };
      mockUseAppStore.mockReturnValue(storeState);

      const { result, rerender } = renderHook(() => useMapCenter());
      const firstResult = result.current;

      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });

    it('returns new reference when activeFocusPreset changes', () => {
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: null,
        filters: { regions: [] },
      });

      const { result, rerender } = renderHook(() => useMapCenter());
      const firstResult = result.current;

      // Update store to have a preset
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: {
          id: 'preset-1',
          mapCenter: { lat: 50, lng: 10, zoom: 5, label: 'New' },
          regions: [],
          topics: [],
        },
        filters: { regions: [] },
      });

      rerender();
      const secondResult = result.current;

      expect(firstResult).not.toBe(secondResult);
    });

    it('returns new reference when regions change', () => {
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: null,
        filters: { regions: ['western'] },
      });

      mockCalculateOptimalMapView.mockReturnValue({
        lat: 45,
        lng: -50,
        zoom: 3,
        label: 'western',
      });

      const { result, rerender } = renderHook(() => useMapCenter());
      const firstResult = result.current;

      // Update regions
      mockUseAppStore.mockReturnValue({
        activeFocusPreset: null,
        filters: { regions: ['western', 'russian'] },
      });

      mockCalculateOptimalMapView.mockReturnValue({
        lat: 50,
        lng: 0,
        zoom: 3,
        label: '2 regions',
      });

      rerender();
      const secondResult = result.current;

      expect(firstResult).not.toBe(secondResult);
    });
  });
});
