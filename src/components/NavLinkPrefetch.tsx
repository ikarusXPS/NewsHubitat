import { useRef, useCallback } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';
import { routePreloaders } from '../routes';

interface NavLinkPrefetchProps extends NavLinkProps {
  /** Delay in ms before triggering prefetch (default: 150ms per D-04) */
  prefetchDelay?: number;
}

/**
 * NavLink wrapper that preloads route chunk on hover.
 *
 * Features:
 * - 150ms delay to filter accidental hovers (D-04)
 * - Clears timer on mouse leave to prevent unnecessary preloads
 * - Falls through to standard NavLink for routes not in preloaders map
 *
 * @example
 * ```tsx
 * <NavLinkPrefetch to="/analysis">Analysis</NavLinkPrefetch>
 * ```
 */
export function NavLinkPrefetch({
  to,
  prefetchDelay = 150,
  onMouseEnter,
  onMouseLeave,
  children,
  ...props
}: NavLinkPrefetchProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const path = typeof to === 'string' ? to : to.pathname;
      const preloader = path ? routePreloaders[path] : undefined;

      if (preloader) {
        timerRef.current = setTimeout(() => {
          preloader();
        }, prefetchDelay);
      }

      onMouseEnter?.(e);
    },
    [to, prefetchDelay, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      onMouseLeave?.(e);
    },
    [onMouseLeave]
  );

  return (
    <NavLink
      to={to}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </NavLink>
  );
}
