import { useState, useEffect, useCallback } from 'react';

/**
 * useMediaQuery hook - SSR-safe media query detection
 *
 * Returns whether the viewport matches a given media query string.
 * Falls back to safe defaults during SSR (no window).
 *
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean - true if viewport matches the query
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export function useMediaQuery(query: string): boolean {
  // SSR-safe: default to false when window is not available
  const getMatches = useCallback((): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    // Set initial value (in case it changed between render and effect)
    setMatches(mediaQueryList.matches);

    // Handler for media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers use addEventListener, older use addListener
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers (Safari < 14)
      mediaQueryList.addListener(handleChange);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Convenience hooks for common breakpoints (matching Tailwind defaults)
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/**
 * Returns current breakpoint name
 */
export function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}
