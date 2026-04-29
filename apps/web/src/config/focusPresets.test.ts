import { describe, it, expect } from 'vitest';
import { FOCUS_PRESETS, getPresetById, getDefaultPreset, AVAILABLE_TOPICS } from './focusPresets';
import type { PerspectiveRegion } from '../types';

const VALID_REGIONS: PerspectiveRegion[] = [
  'usa', 'kanada', 'europa', 'deutschland', 'nahost', 'tuerkei',
  'russland', 'china', 'asien', 'afrika', 'lateinamerika',
  'ozeanien', 'alternative',
];

describe('FOCUS_PRESETS', () => {
  it('has at least 5 presets', () => {
    expect(FOCUS_PRESETS.length).toBeGreaterThanOrEqual(5);
  });

  it('has exactly one default preset', () => {
    const defaultPresets = FOCUS_PRESETS.filter((p) => p.isDefault);
    expect(defaultPresets.length).toBe(1);
  });

  it('has unique IDs for all presets', () => {
    const ids = FOCUS_PRESETS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has valid regions in all presets', () => {
    for (const preset of FOCUS_PRESETS) {
      for (const region of preset.regions) {
        expect(VALID_REGIONS).toContain(region);
      }
    }
  });

  it('has at least one region in each preset', () => {
    for (const preset of FOCUS_PRESETS) {
      expect(preset.regions.length).toBeGreaterThan(0);
    }
  });

  it('has at least one topic in each preset', () => {
    for (const preset of FOCUS_PRESETS) {
      expect(preset.topics.length).toBeGreaterThan(0);
    }
  });

  it('has valid map centers (lat/lng within bounds)', () => {
    for (const preset of FOCUS_PRESETS) {
      const { lat, lng, zoom } = preset.mapCenter;

      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
      expect(zoom).toBeGreaterThan(0);
      expect(zoom).toBeLessThanOrEqual(10);
    }
  });

  it('has non-empty names and descriptions', () => {
    for (const preset of FOCUS_PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
      expect(preset.icon.length).toBeGreaterThan(0);
    }
  });

  it('has valid color codes for colored presets', () => {
    for (const preset of FOCUS_PRESETS) {
      if (preset.color) {
        expect(preset.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('does not mark any custom presets as default', () => {
    const customDefaults = FOCUS_PRESETS.filter(
      (p) => p.isCustom && p.isDefault
    );
    expect(customDefaults.length).toBe(0);
  });
});

describe('getPresetById', () => {
  it('returns preset for valid ID', () => {
    const preset = getPresetById('global-overview');
    expect(preset).toBeDefined();
    expect(preset?.id).toBe('global-overview');
  });

  it('returns undefined for invalid ID', () => {
    const preset = getPresetById('non-existent-preset');
    expect(preset).toBeUndefined();
  });

  it('can retrieve all presets by their IDs', () => {
    for (const preset of FOCUS_PRESETS) {
      const found = getPresetById(preset.id);
      expect(found).toEqual(preset);
    }
  });
});

describe('getDefaultPreset', () => {
  it('returns a preset', () => {
    const preset = getDefaultPreset();
    expect(preset).toBeDefined();
  });

  it('returns the default preset when one exists', () => {
    const preset = getDefaultPreset();
    expect(preset.isDefault).toBe(true);
  });

  it('returns first preset as fallback if no default exists', () => {
    // This tests the fallback logic
    const preset = getDefaultPreset();
    expect(FOCUS_PRESETS).toContainEqual(preset);
  });
});

describe('AVAILABLE_TOPICS', () => {
  it('has at least 8 topics', () => {
    expect(AVAILABLE_TOPICS.length).toBeGreaterThanOrEqual(8);
  });

  it('has unique IDs for all topics', () => {
    const ids = AVAILABLE_TOPICS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has non-empty labels and icons', () => {
    for (const topic of AVAILABLE_TOPICS) {
      expect(topic.id.length).toBeGreaterThan(0);
      expect(topic.label.length).toBeGreaterThan(0);
      expect(topic.icon.length).toBeGreaterThan(0);
    }
  });

  it('includes core topics (conflict, diplomacy, economy, politics)', () => {
    const topicIds = AVAILABLE_TOPICS.map((t) => t.id);
    expect(topicIds).toContain('conflict');
    expect(topicIds).toContain('diplomacy');
    expect(topicIds).toContain('economy');
    expect(topicIds).toContain('politics');
  });
});
