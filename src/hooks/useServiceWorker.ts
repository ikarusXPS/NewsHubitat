import { useEffect, useRef, useState } from 'react';
import { Workbox } from 'workbox-window';

interface ServiceWorkerState {
  needRefresh: boolean;
  isRegistered: boolean;
  error: string | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    needRefresh: false,
    isRegistered: false,
    error: null,
  });
  const wbRef = useRef<Workbox | null>(null);

  useEffect(() => {
    // Only register in production
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
      return;
    }

    const workbox = new Workbox('/sw.js');

    workbox.addEventListener('waiting', () => {
      setState((prev) => ({ ...prev, needRefresh: true }));
    });

    workbox.addEventListener('activated', () => {
      setState((prev) => ({ ...prev, isRegistered: true }));
    });

    workbox.register()
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setState((prev) => ({ ...prev, error: errorMessage }));
      });

    wbRef.current = workbox;
  }, []);

  const updateServiceWorker = () => {
    if (!wbRef.current) return;
    wbRef.current.messageSkipWaiting();
    window.location.reload();
  };

  return {
    ...state,
    updateServiceWorker,
  };
}
