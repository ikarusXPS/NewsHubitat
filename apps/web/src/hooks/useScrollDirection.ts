import { useState, useEffect } from 'react';

export type ScrollDirection = 'up' | 'down';

/**
 * Hook to detect scroll direction with debounce threshold.
 * Used for auto-hiding bottom navigation on scroll down.
 *
 * @returns Current scroll direction ('up' or 'down')
 */
export function useScrollDirection(): ScrollDirection {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('up');

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction: ScrollDirection = scrollY > lastScrollY ? 'down' : 'up';

      // Threshold: 10px to prevent flicker on small movements
      if (Math.abs(scrollY - lastScrollY) > 10) {
        setScrollDirection(direction);
      }

      lastScrollY = scrollY;
    };

    // Use passive event listener for performance
    window.addEventListener('scroll', updateScrollDirection, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollDirection);
  }, []);

  return scrollDirection;
}
