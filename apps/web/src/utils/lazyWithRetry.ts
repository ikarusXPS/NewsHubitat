import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Extended lazy component with preload API for hover prefetching.
 */
interface LazyWithRetry<T extends ComponentType<unknown>> extends LazyExoticComponent<T> {
  preload: () => Promise<{ default: T }>;
}

/**
 * Wraps React.lazy() with retry logic and preload API.
 *
 * Algorithm:
 * - Caches the import promise to prevent duplicate fetches
 * - On failure, waits with exponential backoff (1s, 2s, 4s)
 * - After 3 retries, throws to trigger error boundary
 * - Exposes .preload() for hover prefetching
 *
 * @param importFn - Dynamic import function returning module
 * @param retries - Number of retry attempts (default: 3)
 * @param delay - Initial delay in ms (default: 1000)
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): LazyWithRetry<T> {
  // Cache the import promise to prevent duplicate requests
  let importPromise: Promise<{ default: T }> | null = null;

  /**
   * Retry import with exponential backoff.
   * Clears cache on retry to bypass browser caching of failed imports.
   */
  const retryImport = async (
    retriesLeft: number,
    currentDelay: number
  ): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (error) {
      if (retriesLeft === 0) {
        throw error;
      }

      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, currentDelay));

      // Clear cached promise to allow fresh retry
      importPromise = null;

      return retryImport(retriesLeft - 1, currentDelay * 2);
    }
  };

  /**
   * Load function that caches promise for deduplication.
   * First call starts the import; subsequent calls return cached promise.
   */
  const load = (): Promise<{ default: T }> => {
    if (!importPromise) {
      importPromise = retryImport(retries, delay);
    }
    return importPromise;
  };

  // Create lazy component
  const LazyComponent = lazy(load) as LazyWithRetry<T>;

  // Attach preload method for hover prefetching
  LazyComponent.preload = load;

  return LazyComponent;
}
