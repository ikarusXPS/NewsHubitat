import { useState, useEffect, useCallback } from 'react';

interface BackendStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  error: string | null;
}

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_ENDPOINT = '/api/health';

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>({
    isOnline: true,
    isChecking: false,
    lastCheck: null,
    error: null,
  });

  const checkHealth = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isChecking: true }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(HEALTH_ENDPOINT, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setStatus({
          isOnline: true,
          isChecking: false,
          lastCheck: new Date(),
          error: null,
        });
      } else {
        setStatus({
          isOnline: false,
          isChecking: false,
          lastCheck: new Date(),
          error: `Backend returned ${response.status}`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setStatus({
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        error: errorMessage,
      });
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Periodic health checks
  useEffect(() => {
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    ...status,
    retry: checkHealth,
  };
}
