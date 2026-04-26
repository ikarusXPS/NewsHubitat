import type { PerspectiveRegion } from '../types';

/**
 * Detects default regions to display based on the user's browser locale.
 *
 * Strategy:
 * - German users: Deutschland, Europa, USA, Nahost (local + major regions)
 * - US users: USA, Europa, China, Nahost (Western + major powers)
 * - UK users: Europa, USA, Nahost, Afrika (Commonwealth + major regions)
 * - Default: USA, Europa, China, Russland, Nahost (major global regions)
 *
 * This ensures the application doesn't default to Middle East-only coverage,
 * but adapts to the user's likely interests based on their location.
 */
export function detectDefaultRegions(): PerspectiveRegion[] {
  const locale = navigator.language;

  // German locale
  if (locale.startsWith('de')) {
    return ['deutschland', 'europa', 'usa', 'nahost'];
  }

  // US English
  if (locale.startsWith('en-US')) {
    return ['usa', 'europa', 'china', 'nahost'];
  }

  // UK English
  if (locale.startsWith('en-GB')) {
    return ['europa', 'usa', 'nahost', 'afrika'];
  }

  // Canadian English/French
  if (locale.startsWith('en-CA') || locale.startsWith('fr-CA')) {
    return ['kanada', 'usa', 'europa', 'china'];
  }

  // Turkish
  if (locale.startsWith('tr')) {
    return ['tuerkei', 'europa', 'nahost', 'russland'];
  }

  // Russian
  if (locale.startsWith('ru')) {
    return ['russland', 'europa', 'asien', 'china'];
  }

  // Chinese
  if (locale.startsWith('zh')) {
    return ['china', 'asien', 'usa', 'europa'];
  }

  // Spanish (Latin America)
  if (locale.startsWith('es-MX') || locale.startsWith('es-AR') || locale.startsWith('es-CO')) {
    return ['lateinamerika', 'usa', 'europa', 'china'];
  }

  // Portuguese (Brazil)
  if (locale.startsWith('pt-BR')) {
    return ['lateinamerika', 'usa', 'europa', 'afrika'];
  }

  // French (France)
  if (locale.startsWith('fr-FR')) {
    return ['europa', 'afrika', 'nahost', 'usa'];
  }

  // Arabic
  if (locale.startsWith('ar')) {
    return ['nahost', 'afrika', 'europa', 'tuerkei'];
  }

  // Default: Major global regions (balanced, no specific bias)
  return ['usa', 'europa', 'china', 'russland', 'nahost'];
}

/**
 * Returns all available perspective regions.
 * Useful for "Select All" functionality or global views.
 */
export function getAllRegions(): PerspectiveRegion[] {
  return [
    'usa',
    'europa',
    'deutschland',
    'nahost',
    'tuerkei',
    'russland',
    'china',
    'asien',
    'afrika',
    'lateinamerika',
    'ozeanien',
    'kanada',
    'alternative',
  ];
}

/**
 * Checks if a region code is valid.
 */
export function isValidRegion(region: string): region is PerspectiveRegion {
  const validRegions: PerspectiveRegion[] = getAllRegions();
  return validRegions.includes(region as PerspectiveRegion);
}
