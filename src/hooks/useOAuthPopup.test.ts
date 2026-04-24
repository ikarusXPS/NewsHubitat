/**
 * Unit tests for useOAuthPopup hook
 * Tests OAuth popup flow, message handling, and origin validation
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOAuthPopup } from './useOAuthPopup';

describe('useOAuthPopup', () => {
  let mockPopup: {
    closed: boolean;
    close: ReturnType<typeof vi.fn>;
  };
  let messageHandler: ((event: MessageEvent) => void) | null = null;
  let originalWindow: typeof window;
  let mockSetInterval: ReturnType<typeof vi.fn>;
  let mockClearInterval: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    // Store original window
    originalWindow = window;

    // Create mock popup
    mockPopup = {
      closed: false,
      close: vi.fn(),
    };

    // Track interval IDs
    let intervalId = 0;
    mockSetInterval = vi.fn(() => ++intervalId);
    mockClearInterval = vi.fn();

    // Mock window methods
    vi.stubGlobal('window', {
      ...window,
      open: vi.fn().mockReturnValue(mockPopup),
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (event === 'message') {
          messageHandler = handler as (event: MessageEvent) => void;
        }
      }),
      removeEventListener: vi.fn(),
      setInterval: mockSetInterval,
      clearInterval: mockClearInterval,
      location: { origin: 'http://localhost:5173' },
      screenX: 0,
      screenY: 0,
      innerWidth: 1024,
      innerHeight: 768,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    messageHandler = null;
  });

  describe('initialization', () => {
    it('initializes with loading=false and no error', () => {
      const { result } = renderHook(() => useOAuthPopup());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('provides openOAuthPopup and closePopup functions', () => {
      const { result } = renderHook(() => useOAuthPopup());

      expect(typeof result.current.openOAuthPopup).toBe('function');
      expect(typeof result.current.closePopup).toBe('function');
    });
  });

  describe('openOAuthPopup', () => {
    it('opens popup window for Google OAuth', () => {
      const { result } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('google');
      });

      expect(window.open).toHaveBeenCalledWith(
        '/api/auth/google',
        'oauth-popup',
        expect.stringContaining('width=500')
      );
      expect(result.current.isLoading).toBe(true);
    });

    it('opens popup window for GitHub OAuth', () => {
      const { result } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('github');
      });

      expect(window.open).toHaveBeenCalledWith(
        '/api/auth/github',
        'oauth-popup',
        expect.stringContaining('width=500')
      );
      expect(result.current.isLoading).toBe(true);
    });

    it('sets error when popup is blocked', () => {
      vi.mocked(window.open).mockReturnValue(null);
      const onError = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onError }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Popup was blocked. Please allow popups and try again.');
      expect(onError).toHaveBeenCalledWith('Popup was blocked. Please allow popups and try again.');
    });

    it('starts polling for popup closed state', () => {
      const { result } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('google');
      });

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 500);
    });
  });

  describe('message handling', () => {
    it('handles successful OAuth callback with token', () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onSuccess }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      // Simulate postMessage from popup
      act(() => {
        messageHandler?.({
          origin: 'http://localhost:5173',
          data: {
            type: 'OAUTH_SUCCESS',
            token: 'jwt_token_123',
            needsLinking: false,
          },
        } as MessageEvent);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(onSuccess).toHaveBeenCalledWith({
        type: 'OAUTH_SUCCESS',
        token: 'jwt_token_123',
        needsLinking: false,
      });
    });

    it('handles OAuth error callback', () => {
      const onError = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onError }));

      act(() => {
        result.current.openOAuthPopup('github');
      });

      act(() => {
        messageHandler?.({
          origin: 'http://localhost:5173',
          data: {
            type: 'OAUTH_ERROR',
            error: 'Authentication failed',
          },
        } as MessageEvent);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Authentication failed');
      expect(onError).toHaveBeenCalledWith('Authentication failed');
    });

    it('handles OAuth error with default message', () => {
      const onError = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onError }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      act(() => {
        messageHandler?.({
          origin: 'http://localhost:5173',
          data: {
            type: 'OAUTH_ERROR',
            // No error message provided
          },
        } as MessageEvent);
      });

      expect(result.current.error).toBe('Authentication failed');
      expect(onError).toHaveBeenCalledWith('Authentication failed');
    });

    it('handles needsLinking callback', () => {
      const onNeedsLinking = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onNeedsLinking }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      act(() => {
        messageHandler?.({
          origin: 'http://localhost:5173',
          data: {
            type: 'OAUTH_SUCCESS',
            needsLinking: true,
            email: 'test@example.com',
          },
        } as MessageEvent);
      });

      expect(onNeedsLinking).toHaveBeenCalledWith('test@example.com');
    });

    it('stops loading when success message received', () => {
      const { result } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('google');
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        messageHandler?.({
          origin: 'http://localhost:5173',
          data: {
            type: 'OAUTH_SUCCESS',
            token: 'test_token',
          },
        } as MessageEvent);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('origin validation (security)', () => {
    it('ignores messages from different origins', () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onSuccess }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      act(() => {
        messageHandler?.({
          origin: 'http://malicious-site.com',
          data: {
            type: 'OAUTH_SUCCESS',
            token: 'stolen_token',
          },
        } as MessageEvent);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true); // Still loading
    });

    it('ignores messages from subdomain spoofing attempts', () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onSuccess }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      act(() => {
        messageHandler?.({
          origin: 'http://localhost:5173.malicious.com',
          data: {
            type: 'OAUTH_SUCCESS',
            token: 'spoofed_token',
          },
        } as MessageEvent);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });

    it('ignores messages with different protocol', () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onSuccess }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      act(() => {
        messageHandler?.({
          origin: 'https://localhost:5173', // https vs http
          data: {
            type: 'OAUTH_SUCCESS',
            token: 'wrong_protocol_token',
          },
        } as MessageEvent);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('message type validation', () => {
    it('ignores non-OAuth messages', () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onSuccess }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      act(() => {
        messageHandler?.({
          origin: 'http://localhost:5173',
          data: {
            type: 'SOME_OTHER_MESSAGE',
            data: 'something',
          },
        } as MessageEvent);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });

    it('ignores messages without type', () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onSuccess }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      act(() => {
        messageHandler?.({
          origin: 'http://localhost:5173',
          data: {
            token: 'no_type_token',
          },
        } as MessageEvent);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });

    it('ignores empty object data', () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useOAuthPopup({ onSuccess }));

      act(() => {
        result.current.openOAuthPopup('google');
      });

      act(() => {
        messageHandler?.({
          origin: 'http://localhost:5173',
          data: {},
        } as MessageEvent);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('closePopup', () => {
    it('closes popup window and stops loading', () => {
      const { result } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('google');
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.closePopup();
      });

      expect(mockPopup.close).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('stops loading after closePopup', () => {
      const { result } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('google');
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.closePopup();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('handles already closed popup gracefully', () => {
      mockPopup.closed = true;

      const { result } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('google');
      });

      act(() => {
        result.current.closePopup();
      });

      // Should not throw
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('popup reference', () => {
    it('maintains popup reference for later operations', () => {
      const { result } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('google');
      });

      // Verify popup was opened
      expect(window.open).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(true);

      // closePopup should work because popup reference is maintained
      act(() => {
        result.current.closePopup();
      });

      expect(mockPopup.close).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes message listener on unmount', () => {
      const { unmount } = renderHook(() => useOAuthPopup());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('closes popup on unmount', () => {
      const { result, unmount } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('google');
      });

      unmount();

      expect(mockPopup.close).toHaveBeenCalled();
    });
  });

  describe('multiple opens', () => {
    it('handles opening new popup when one is already open', () => {
      const { result } = renderHook(() => useOAuthPopup());

      act(() => {
        result.current.openOAuthPopup('google');
      });

      // Create a new mock popup for the second open
      const secondPopup = { closed: false, close: vi.fn() };
      vi.mocked(window.open).mockReturnValue(secondPopup);

      act(() => {
        result.current.openOAuthPopup('github');
      });

      expect(window.open).toHaveBeenCalledTimes(2);
      expect(result.current.isLoading).toBe(true);
    });
  });
});
