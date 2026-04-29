import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GeoEvent } from '../types';

// Server event types (mirror websocketService.ts)
interface ServerToClientEvents {
  'event:new': (event: GeoEvent) => void;
  'event:updated': (event: Partial<GeoEvent> & { id: string }) => void;
  'event:severity-change': (data: { eventId: string; oldSeverity: string; newSeverity: string }) => void;
  'connected': (data: { clientId: string; serverTime: number }) => void;
}

interface ClientToServerEvents {
  'subscribe:region': (region: string) => void;
  'unsubscribe:region': (region: string) => void;
  'ping': () => void;
}

export interface EventSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEventTime: Date | null;
  newEvents: GeoEvent[];
  clearNewEvents: () => void;
}

interface UseEventSocketOptions {
  enabled?: boolean;
  onNewEvent?: (event: GeoEvent) => void;
  onSeverityChange?: (data: { eventId: string; oldSeverity: string; newSeverity: string }) => void;
}

const SOCKET_URL = import.meta.env.VITE_WS_URL || '';

export function useEventSocket(options: UseEventSocketOptions = {}): EventSocketState {
  const { enabled = true, onNewEvent, onSeverityChange } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [newEvents, setNewEvents] = useState<GeoEvent[]>([]);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const clearNewEvents = useCallback(() => {
    setNewEvents([]);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setIsConnected(false);
        setIsConnecting(false);
      });
      return;
    }

    queueMicrotask(() => {
      setIsConnecting(true);
      setError(null);
    });

    // Initialize socket connection
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      console.log('[EventSocket] Connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[EventSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      setIsConnecting(false);
      setError(err.message);
      console.error('[EventSocket] Connection error:', err.message);
    });

    // Business events
    socket.on('event:new', (event: GeoEvent) => {
      setLastEventTime(new Date());
      setNewEvents(prev => [event, ...prev].slice(0, 10)); // Keep last 10
      onNewEvent?.(event);
    });

    socket.on('event:severity-change', (data) => {
      onSeverityChange?.(data);
    });

    socket.on('connected', (data) => {
      console.log('[EventSocket] Server confirmed connection:', data.clientId);
    });

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('event:new');
      socket.off('event:severity-change');
      socket.off('connected');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onNewEvent, onSeverityChange]);

  return {
    isConnected,
    isConnecting,
    error,
    lastEventTime,
    newEvents,
    clearNewEvents,
  };
}
