import { useState, useEffect } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * useAccessibilityFallback - Detect when to use paginated fallback
 *
 * Returns true if user prefers reduced motion or screen reader is detected.
 * Used to switch from virtualized scrolling to paginated "Load More" mode.
 */
export function useAccessibilityFallback(): { shouldUseFallback: boolean } {
  // D-18: Detect reduced motion preference using existing hook
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Screen reader detection heuristic (imperfect but covers common cases)
  const [screenReaderDetected, setScreenReaderDetected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Heuristic: Check for common assistive technology indicators
    const isScreenReader =
      window.navigator.userAgent.includes('NVDA') ||
      window.navigator.userAgent.includes('JAWS') ||
      document.querySelector('[aria-live="polite"]') !== null;

    setScreenReaderDetected(isScreenReader);
  }, []);

  return {
    shouldUseFallback: prefersReducedMotion || screenReaderDetected,
  };
}
