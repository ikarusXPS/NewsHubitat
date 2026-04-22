/**
 * Unit tests for useEventSocket hook
 * Tests Socket.IO connection lifecycle, event handling, and newEvents array management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEventSocket } from './useEventSocket';
import { getMockGeoEvent, resetIdCounter } from '../test/factories';

// Capture event handlers for testing
const eventHandlers = new Map<string, (...args: unknown[]) => void>();

const mockSocket = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    eventHandlers.set(event, handler);
    return mockSocket;
  }),
  off: vi.fn((event: string) => {
    eventHandlers.delete(event);
    return mockSocket;
  }),
  disconnect: vi.fn(),
  emit: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { io } from 'socket.io-client';

// Helper to simulate socket events
function emitSocketEvent(event: string, data?: unknown): void {
  const handler = eventHandlers.get(event);
  if (handler) handler(data);
}

describe('useEventSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.clear();
    resetIdCounter();
    // Reset mock socket methods
    mockSocket.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers.set(event, handler);
      return mockSocket;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    eventHandlers.clear();
  });

  describe('initial state', () => {
    it('starts disconnected with empty newEvents', () => {
      const { result } = renderHook(() => useEventSocket({ enabled: false }));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastEventTime).toBeNull();
      expect(result.current.newEvents).toEqual([]);
    });

    it('provides clearNewEvents function', () => {
      const { result } = renderHook(() => useEventSocket({ enabled: false }));
      expect(typeof result.current.clearNewEvents).toBe('function');
    });
  });

  describe('connection lifecycle', () => {
    it('calls io() when enabled=true', () => {
      renderHook(() => useEventSocket({ enabled: true }));
      expect(io).toHaveBeenCalled();
    });

    it('does not connect when enabled=false', () => {
      renderHook(() => useEventSocket({ enabled: false }));
      expect(io).not.toHaveBeenCalled();
    });

    it('disconnects when enabled changes to false', async () => {
      const { rerender } = renderHook(
        ({ enabled }) => useEventSocket({ enabled }),
        { initialProps: { enabled: true } }
      );

      expect(io).toHaveBeenCalledTimes(1);

      rerender({ enabled: false });

      await waitFor(() => {
        expect(mockSocket.disconnect).toHaveBeenCalled();
      });
    });

    it('sets up all socket event listeners when enabled', () => {
      renderHook(() => useEventSocket({ enabled: true }));

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('event:new', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('event:severity-change', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connected', expect.any(Function));
    });

    it('reconnects when enabled changes from false to true', async () => {
      const { rerender } = renderHook(
        ({ enabled }) => useEventSocket({ enabled }),
        { initialProps: { enabled: false } }
      );

      expect(io).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(io).toHaveBeenCalled();
      });
    });
  });

  describe('socket events', () => {
    it('sets isConnected=true on connect', async () => {
      const { result } = renderHook(() => useEventSocket({ enabled: true }));

      act(() => {
        emitSocketEvent('connect');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('sets isConnected=false on disconnect', async () => {
      const { result } = renderHook(() => useEventSocket({ enabled: true }));

      // First connect
      act(() => {
        emitSocketEvent('connect');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Then disconnect
      act(() => {
        emitSocketEvent('disconnect', 'transport close');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });

    it('sets error on connect_error', async () => {
      const { result } = renderHook(() => useEventSocket({ enabled: true }));

      act(() => {
        emitSocketEvent('connect_error', new Error('Connection failed'));
      });

      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.error).toBe('Connection failed');
      });
    });

    it('handles connected event (server confirmation)', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderHook(() => useEventSocket({ enabled: true }));

      act(() => {
        emitSocketEvent('connected', { clientId: 'test-client-123', serverTime: Date.now() });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[EventSocket] Server confirmed connection:',
        'test-client-123'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('event:new handling', () => {
    it('adds event to newEvents array', async () => {
      const { result } = renderHook(() => useEventSocket({ enabled: true }));
      const mockEvent = getMockGeoEvent();

      act(() => {
        emitSocketEvent('event:new', mockEvent);
      });

      await waitFor(() => {
        expect(result.current.newEvents).toContainEqual(mockEvent);
        expect(result.current.newEvents.length).toBe(1);
      });
    });

    it('prepends new events (newest first)', async () => {
      const { result } = renderHook(() => useEventSocket({ enabled: true }));

      const event1 = getMockGeoEvent({ title: 'First Event' });
      const event2 = getMockGeoEvent({ title: 'Second Event' });

      act(() => {
        emitSocketEvent('event:new', event1);
      });

      await waitFor(() => {
        expect(result.current.newEvents.length).toBe(1);
      });

      act(() => {
        emitSocketEvent('event:new', event2);
      });

      await waitFor(() => {
        expect(result.current.newEvents.length).toBe(2);
        expect(result.current.newEvents[0].title).toBe('Second Event');
        expect(result.current.newEvents[1].title).toBe('First Event');
      });
    });

    it('limits newEvents to 10 items', async () => {
      const { result } = renderHook(() => useEventSocket({ enabled: true }));

      // Add 12 events
      for (let i = 0; i < 12; i++) {
        act(() => {
          emitSocketEvent('event:new', getMockGeoEvent({ title: `Event ${i + 1}` }));
        });
      }

      await waitFor(() => {
        expect(result.current.newEvents.length).toBe(10);
      });

      // Verify oldest events were dropped (newest first)
      expect(result.current.newEvents[0].title).toBe('Event 12');
      expect(result.current.newEvents[9].title).toBe('Event 3');
    });

    it('sets lastEventTime on new event', async () => {
      const { result } = renderHook(() => useEventSocket({ enabled: true }));

      expect(result.current.lastEventTime).toBeNull();

      const mockEvent = getMockGeoEvent();
      const beforeTime = new Date();

      act(() => {
        emitSocketEvent('event:new', mockEvent);
      });

      const afterTime = new Date();

      await waitFor(() => {
        expect(result.current.lastEventTime).not.toBeNull();
        expect(result.current.lastEventTime!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(result.current.lastEventTime!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });
    });

    it('calls onNewEvent callback', async () => {
      const onNewEvent = vi.fn();
      renderHook(() => useEventSocket({ enabled: true, onNewEvent }));

      const mockEvent = getMockGeoEvent();

      act(() => {
        emitSocketEvent('event:new', mockEvent);
      });

      await waitFor(() => {
        expect(onNewEvent).toHaveBeenCalledWith(mockEvent);
        expect(onNewEvent).toHaveBeenCalledTimes(1);
      });
    });

    it('does not error when onNewEvent is not provided', () => {
      renderHook(() => useEventSocket({ enabled: true }));

      expect(() => {
        act(() => {
          emitSocketEvent('event:new', getMockGeoEvent());
        });
      }).not.toThrow();
    });
  });

  describe('event:severity-change handling', () => {
    it('calls onSeverityChange callback', async () => {
      const onSeverityChange = vi.fn();
      renderHook(() => useEventSocket({ enabled: true, onSeverityChange }));

      const severityData = {
        eventId: 'event-1',
        oldSeverity: 'low',
        newSeverity: 'high',
      };

      act(() => {
        emitSocketEvent('event:severity-change', severityData);
      });

      await waitFor(() => {
        expect(onSeverityChange).toHaveBeenCalledWith(severityData);
        expect(onSeverityChange).toHaveBeenCalledTimes(1);
      });
    });

    it('does not error when onSeverityChange is not provided', () => {
      renderHook(() => useEventSocket({ enabled: true }));

      expect(() => {
        act(() => {
          emitSocketEvent('event:severity-change', {
            eventId: 'event-1',
            oldSeverity: 'medium',
            newSeverity: 'critical',
          });
        });
      }).not.toThrow();
    });
  });

  describe('clearNewEvents', () => {
    it('empties the newEvents array', async () => {
      const { result } = renderHook(() => useEventSocket({ enabled: true }));

      // Add some events
      act(() => {
        emitSocketEvent('event:new', getMockGeoEvent());
        emitSocketEvent('event:new', getMockGeoEvent());
        emitSocketEvent('event:new', getMockGeoEvent());
      });

      await waitFor(() => {
        expect(result.current.newEvents.length).toBe(3);
      });

      // Clear events
      act(() => {
        result.current.clearNewEvents();
      });

      await waitFor(() => {
        expect(result.current.newEvents).toEqual([]);
        expect(result.current.newEvents.length).toBe(0);
      });
    });

    it('can be called when array is already empty', () => {
      const { result } = renderHook(() => useEventSocket({ enabled: true }));

      expect(result.current.newEvents).toEqual([]);

      expect(() => {
        act(() => {
          result.current.clearNewEvents();
        });
      }).not.toThrow();

      expect(result.current.newEvents).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('removes listeners and disconnects on unmount', async () => {
      const { unmount } = renderHook(() => useEventSocket({ enabled: true }));

      expect(io).toHaveBeenCalledTimes(1);

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('connect');
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect');
      expect(mockSocket.off).toHaveBeenCalledWith('connect_error');
      expect(mockSocket.off).toHaveBeenCalledWith('event:new');
      expect(mockSocket.off).toHaveBeenCalledWith('event:severity-change');
      expect(mockSocket.off).toHaveBeenCalledWith('connected');
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('does not disconnect when unmounting if never connected', () => {
      const { unmount } = renderHook(() => useEventSocket({ enabled: false }));

      unmount();

      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('default options', () => {
    it('defaults enabled to true when no options provided', () => {
      renderHook(() => useEventSocket());
      expect(io).toHaveBeenCalled();
    });

    it('accepts empty options object', () => {
      renderHook(() => useEventSocket({}));
      expect(io).toHaveBeenCalled();
    });
  });

  describe('socket configuration', () => {
    it('configures socket with proper options', () => {
      renderHook(() => useEventSocket({ enabled: true }));

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
        })
      );
    });
  });

  describe('callback stability', () => {
    it('reconnects when onNewEvent callback changes', async () => {
      const onNewEvent1 = vi.fn();
      const onNewEvent2 = vi.fn();

      const { rerender } = renderHook(
        ({ onNewEvent }) => useEventSocket({ enabled: true, onNewEvent }),
        { initialProps: { onNewEvent: onNewEvent1 } }
      );

      expect(io).toHaveBeenCalledTimes(1);

      // When callback changes, effect should re-run
      rerender({ onNewEvent: onNewEvent2 });

      // Socket should be reconnected due to dependency change
      // The exact behavior depends on implementation, but let's verify the new callback works
      const mockEvent = getMockGeoEvent();
      act(() => {
        emitSocketEvent('event:new', mockEvent);
      });

      await waitFor(() => {
        // New callback should be called after rerender
        expect(onNewEvent2).toHaveBeenCalledWith(mockEvent);
      });
    });
  });
});
