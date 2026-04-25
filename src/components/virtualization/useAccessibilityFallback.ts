import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * useAccessibilityFallback - Detect when to use paginated fallback
 *
 * Returns true if user prefers reduced motion.
 * Used to switch from virtualized scrolling to paginated "Load More" mode.
 *
 * Note: Screen reader detection was removed as user agent heuristics are unreliable.
 * NVDA/JAWS do not modify browser user agent strings. Screen readers work fine
 * with virtualization; the real accessibility concern is users who prefer less
 * animation/scrolling effects.
 */
export function useAccessibilityFallback(): { shouldUseFallback: boolean } {
  // D-18: Detect reduced motion preference using existing hook
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return {
    shouldUseFallback: prefersReducedMotion,
  };
}
