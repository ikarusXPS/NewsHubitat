import { useCallback, useEffect, useRef, useState } from 'react';

export interface OAuthResult {
  type: 'OAUTH_SUCCESS' | 'OAUTH_ERROR';
  token?: string;
  needsLinking?: boolean;
  email?: string;
  error?: string;
}

interface UseOAuthPopupOptions {
  onSuccess?: (result: OAuthResult) => void;
  onError?: (error: string) => void;
  onNeedsLinking?: (email: string) => void;
}

export function useOAuthPopup(options: UseOAuthPopupOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  // Store options in ref to avoid re-running effect on options change
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  // Message handler for postMessage from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // D-08: Validate origin to prevent postMessage attacks
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data as OAuthResult;
      if (!data.type || !['OAUTH_SUCCESS', 'OAUTH_ERROR'].includes(data.type)) {
        return;
      }

      setIsLoading(false);

      // Clear popup check interval
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }

      if (data.type === 'OAUTH_ERROR') {
        setError(data.error || 'Authentication failed');
        optionsRef.current.onError?.(data.error || 'Authentication failed');
        return;
      }

      if (data.needsLinking && data.email) {
        // D-01: User needs to re-authenticate to link account
        optionsRef.current.onNeedsLinking?.(data.email);
        return;
      }

      if (data.token) {
        setError(null);
        optionsRef.current.onSuccess?.(data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const openOAuthPopup = useCallback((provider: 'google' | 'github') => {
    setIsLoading(true);
    setError(null);

    // Popup dimensions and positioning
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    // Open popup
    const popup = window.open(
      `/api/auth/${provider}`,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      setIsLoading(false);
      const errorMsg = 'Popup was blocked. Please allow popups and try again.';
      setError(errorMsg);
      optionsRef.current.onError?.(errorMsg);
      return;
    }

    popupRef.current = popup;

    // Check if popup was closed without completing
    checkIntervalRef.current = window.setInterval(() => {
      if (popup.closed) {
        setIsLoading(false);
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        // Don't set error - user may have intentionally closed
      }
    }, 500);
  }, []);

  const closePopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closePopup();
    };
  }, [closePopup]);

  return {
    openOAuthPopup,
    closePopup,
    isLoading,
    error,
  };
}
