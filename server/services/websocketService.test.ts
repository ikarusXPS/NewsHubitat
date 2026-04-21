/**
 * Unit tests for WebSocketService
 * Tests Socket.IO initialization, connection lifecycle, room subscriptions,
 * broadcast methods, and graceful shutdown
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as HttpServer } from 'http';
import type { NewsArticle, GeoEvent } from '../../src/types';

// Store the connection handler for manual triggering
let connectionHandler: ((socket: MockSocket) => void) | null = null;

// Socket event handlers storage
const socketHandlers = new Map<string, Map<string, (...args: unknown[]) => void>>();

interface MockSocket {
  id: string;
  data: {
    subscribedRegions: Set<string>;
    subscribedTopics: Set<string>;
    userId?: string;
    authenticatedAt?: Date;
  };
  emit: ReturnType<typeof vi.fn>;
  join: ReturnType<typeof vi.fn>;
  leave: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

// Create mock socket with all methods
const createMockSocket = (id: string = 'socket-1'): MockSocket => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  socketHandlers.set(id, handlers);

  return {
    id,
    data: {
      subscribedRegions: new Set<string>(),
      subscribedTopics: new Set<string>(),
      userId: undefined,
      authenticatedAt: undefined,
    },
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
  };
};

// Create mock for Socket.IO Server - must be defined before vi.mock since it uses vi.hoisted
const { mockIo, mockRooms, mockServerConstructor } = vi.hoisted(() => {
  const mockRooms = new Map([
    ['region:western', new Set(['socket-1'])],
    ['topic:military', new Set(['socket-2'])],
  ]);

  // Note: connectionHandler will be set in the mock's on() method
  const mockIo = {
    on: vi.fn((event: string, handler: (socket: unknown) => void) => {
      if (event === 'connection') {
        // We need to use a global reference since this gets hoisted
        (globalThis as Record<string, unknown>).__wsConnectionHandler = handler;
      }
    }),
    emit: vi.fn(),
    to: vi.fn().mockReturnThis(),
    sockets: {
      adapter: {
        rooms: mockRooms,
      },
    },
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockServerConstructor = vi.fn(function () {
    return mockIo;
  });

  return { mockIo, mockRooms, mockServerConstructor };
});

vi.mock('socket.io', () => ({
  Server: mockServerConstructor,
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Import after mocks
import { WebSocketService } from './websocketService';

// Helper to trigger connection event
const triggerConnection = (socket: MockSocket): void => {
  const handler = (globalThis as Record<string, unknown>).__wsConnectionHandler as ((socket: MockSocket) => void) | undefined;
  if (handler) {
    handler(socket);
  }
};

// Helper to trigger socket event
const triggerSocketEvent = (socket: MockSocket, event: string, ...args: unknown[]): void => {
  const handlers = socketHandlers.get(socket.id);
  const handler = handlers?.get(event);
  if (handler) handler(...args);
};

// Mock article for broadcast tests
const mockArticle: NewsArticle = {
  id: 'article-1',
  title: 'Test Article',
  content: 'Content',
  url: 'https://example.com',
  publishedAt: new Date(),
  source: {
    id: 'src-1',
    name: 'Test',
    country: 'US',
    region: 'western',
    language: 'en',
  } as NewsArticle['source'],
  perspective: 'western',
  topics: ['military', 'diplomacy'],
  entities: [],
  sentiment: 'neutral',
  sentimentScore: 0,
  regions: ['western'],
  imageUrl: null,
  category: 'politics',
} as NewsArticle;

// Mock event for broadcast tests
const mockEvent: GeoEvent = {
  id: 'event-1',
  title: 'Test Event',
  description: 'Test event description',
  location: { lat: 0, lng: 0, region: 'western' },
  severity: 'medium',
  category: 'conflict',
  date: new Date(),
  sources: [],
} as GeoEvent;

describe('WebSocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    (globalThis as Record<string, unknown>).__wsConnectionHandler = null;
    socketHandlers.clear();
    mockRooms.clear();
    mockRooms.set('region:western', new Set(['socket-1']));
    mockRooms.set('topic:military', new Set(['socket-2']));
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).__wsConnectionHandler = null;
    socketHandlers.clear();
    // Reset singleton instance between tests
    (WebSocketService as unknown as { instance: WebSocketService | null }).instance = null;
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = WebSocketService.getInstance();
      const instance2 = WebSocketService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return false from isAvailable before initialize', () => {
      const service = WebSocketService.getInstance();
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should create Socket.IO Server on initialize', () => {
      const service = WebSocketService.getInstance();
      const mockHttpServer = {} as HttpServer;

      service.initialize(mockHttpServer);

      expect(mockServerConstructor).toHaveBeenCalledWith(mockHttpServer, expect.objectContaining({
        cors: expect.any(Object),
        pingTimeout: 60000,
        pingInterval: 25000,
      }));
    });

    it('should set up connection handler on initialize', () => {
      const service = WebSocketService.getInstance();
      const mockHttpServer = {} as HttpServer;

      service.initialize(mockHttpServer);

      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect((globalThis as Record<string, unknown>).__wsConnectionHandler).not.toBeNull();
    });

    it('should return true from isAvailable after initialize', () => {
      const service = WebSocketService.getInstance();
      const mockHttpServer = {} as HttpServer;

      service.initialize(mockHttpServer);

      expect(service.isAvailable()).toBe(true);
    });

    it('should configure CORS from ALLOWED_ORIGINS env var', () => {
      vi.stubEnv('ALLOWED_ORIGINS', 'https://example.com,https://app.example.com');
      // Reset instance to pick up new env
      (WebSocketService as unknown as { instance: WebSocketService | null }).instance = null;

      const service = WebSocketService.getInstance();
      const mockHttpServer = {} as HttpServer;

      service.initialize(mockHttpServer);

      expect(mockServerConstructor).toHaveBeenCalledWith(mockHttpServer, expect.objectContaining({
        cors: expect.objectContaining({
          origin: ['https://example.com', 'https://app.example.com'],
        }),
      }));
    });
  });

  describe('Connection Lifecycle', () => {
    it('should emit connected event on new connection', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
        clientId: 'client-1',
        serverTime: expect.any(Number),
      }));
    });

    it('should initialize socket.data with empty Sets', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      expect(socket.data.subscribedRegions).toBeInstanceOf(Set);
      expect(socket.data.subscribedTopics).toBeInstanceOf(Set);
      expect(socket.data.subscribedRegions.size).toBe(0);
      expect(socket.data.subscribedTopics.size).toBe(0);
    });

    it('should track client in connectedClients Map', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      expect(service.getClientCount()).toBe(0);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      expect(service.getClientCount()).toBe(1);
    });

    it('should remove client on disconnect', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);
      expect(service.getClientCount()).toBe(1);

      triggerSocketEvent(socket, 'disconnect', 'client disconnect');
      expect(service.getClientCount()).toBe(0);
    });

    it('should return connected client count from getClientCount', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket1 = createMockSocket('client-1');
      const socket2 = createMockSocket('client-2');
      const socket3 = createMockSocket('client-3');

      triggerConnection(socket1);
      expect(service.getClientCount()).toBe(1);

      triggerConnection(socket2);
      expect(service.getClientCount()).toBe(2);

      triggerConnection(socket3);
      expect(service.getClientCount()).toBe(3);

      triggerSocketEvent(socket2, 'disconnect', 'client disconnect');
      expect(service.getClientCount()).toBe(2);
    });
  });

  describe('Region Subscriptions', () => {
    it('should join region room on subscribe:region', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      triggerSocketEvent(socket, 'subscribe:region', 'western');

      expect(socket.join).toHaveBeenCalledWith('region:western');
    });

    it('should add region to subscribedRegions Set on subscribe', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      triggerSocketEvent(socket, 'subscribe:region', 'western');

      expect(socket.data.subscribedRegions.has('western')).toBe(true);
    });

    it('should leave region room on unsubscribe:region', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);
      triggerSocketEvent(socket, 'subscribe:region', 'western');

      triggerSocketEvent(socket, 'unsubscribe:region', 'western');

      expect(socket.leave).toHaveBeenCalledWith('region:western');
    });

    it('should remove region from subscribedRegions Set on unsubscribe', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);
      triggerSocketEvent(socket, 'subscribe:region', 'western');
      expect(socket.data.subscribedRegions.has('western')).toBe(true);

      triggerSocketEvent(socket, 'unsubscribe:region', 'western');

      expect(socket.data.subscribedRegions.has('western')).toBe(false);
    });
  });

  describe('Topic Subscriptions', () => {
    it('should join topic room on subscribe:topic', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      triggerSocketEvent(socket, 'subscribe:topic', 'military');

      expect(socket.join).toHaveBeenCalledWith('topic:military');
    });

    it('should add topic to subscribedTopics Set on subscribe', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      triggerSocketEvent(socket, 'subscribe:topic', 'military');

      expect(socket.data.subscribedTopics.has('military')).toBe(true);
    });

    it('should leave topic room on unsubscribe:topic', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);
      triggerSocketEvent(socket, 'subscribe:topic', 'military');

      triggerSocketEvent(socket, 'unsubscribe:topic', 'military');

      expect(socket.leave).toHaveBeenCalledWith('topic:military');
    });

    it('should remove topic from subscribedTopics Set on unsubscribe', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);
      triggerSocketEvent(socket, 'subscribe:topic', 'military');
      expect(socket.data.subscribedTopics.has('military')).toBe(true);

      triggerSocketEvent(socket, 'unsubscribe:topic', 'military');

      expect(socket.data.subscribedTopics.has('military')).toBe(false);
    });
  });

  describe('Authentication', () => {
    it('should set authenticatedAt on authenticate event', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      expect(socket.data.authenticatedAt).toBeUndefined();

      triggerSocketEvent(socket, 'authenticate', 'test-token');

      expect(socket.data.authenticatedAt).toBeInstanceOf(Date);
    });

    it('should join authenticated room on authenticate', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      triggerSocketEvent(socket, 'authenticate', 'test-token');

      expect(socket.join).toHaveBeenCalledWith('authenticated');
    });

    it('should handle ping event without response', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);

      // ping handler should be registered
      const handlers = socketHandlers.get(socket.id);
      expect(handlers?.has('ping')).toBe(true);

      // Trigger ping - should not throw
      expect(() => triggerSocketEvent(socket, 'ping')).not.toThrow();

      // No response should be emitted for ping
      expect(socket.emit).not.toHaveBeenCalledWith('pong', expect.anything());
    });
  });

  describe('Article Broadcasts', () => {
    it('should emit news:new to all clients on broadcastNewArticle', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      service.broadcastNewArticle(mockArticle);

      expect(mockIo.emit).toHaveBeenCalledWith('news:new', mockArticle);
    });

    it('should emit to region room on broadcastNewArticle', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      service.broadcastNewArticle(mockArticle);

      expect(mockIo.to).toHaveBeenCalledWith('region:western');
      expect(mockIo.emit).toHaveBeenCalledWith('news:new', mockArticle);
    });

    it('should emit to topic rooms on broadcastNewArticle', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      service.broadcastNewArticle(mockArticle);

      // Article has topics: ['military', 'diplomacy']
      expect(mockIo.to).toHaveBeenCalledWith('topic:military');
      expect(mockIo.to).toHaveBeenCalledWith('topic:diplomacy');
    });

    it('should emit news:breaking on broadcastBreakingNews', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      service.broadcastBreakingNews(mockArticle);

      expect(mockIo.emit).toHaveBeenCalledWith('news:breaking', mockArticle);
    });
  });

  describe('Event Broadcasts', () => {
    it('should emit event:new on broadcastNewEvent', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      service.broadcastNewEvent(mockEvent);

      expect(mockIo.emit).toHaveBeenCalledWith('event:new', mockEvent);
    });

    it('should emit to region room when event has location.region', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      service.broadcastNewEvent(mockEvent);

      expect(mockIo.to).toHaveBeenCalledWith('region:western');
      expect(mockIo.emit).toHaveBeenCalledWith('event:new', mockEvent);
    });

    it('should emit event:severity-change with old and new severity', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      service.broadcastSeverityChange('event-1', 'medium', 'critical');

      expect(mockIo.emit).toHaveBeenCalledWith('event:severity-change', {
        eventId: 'event-1',
        oldSeverity: 'medium',
        newSeverity: 'critical',
      });
    });

    it('should emit analysis:tension-index with value and change', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      service.broadcastTensionIndex(75, 5);

      expect(mockIo.emit).toHaveBeenCalledWith('analysis:tension-index', {
        value: 75,
        change: 5,
      });
    });
  });

  describe('Analysis Broadcasts', () => {
    it('should emit analysis:cluster-updated with topic and articleCount', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      service.broadcastClusterUpdate('Gaza', 15);

      expect(mockIo.emit).toHaveBeenCalledWith('analysis:cluster-updated', {
        topic: 'Gaza',
        articleCount: 15,
      });
    });

    it('should emit stats to authenticated room on broadcastStats', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      // Add some room entries
      mockRooms.set('region:western', new Set(['socket-1']));
      mockRooms.set('topic:military', new Set(['socket-2']));
      mockRooms.set('authenticated', new Set(['socket-1']));

      service.broadcastStats();

      expect(mockIo.to).toHaveBeenCalledWith('authenticated');
      expect(mockIo.emit).toHaveBeenCalledWith('stats', expect.objectContaining({
        connectedClients: expect.any(Number),
        activeRooms: expect.any(Array),
      }));
    });
  });

  describe('User-Specific Events', () => {
    it('should emit notification to user sockets on sendNotification', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);
      socket.data.userId = 'user-123';

      const notification = {
        type: 'alert',
        title: 'Test',
        message: 'Test message',
        data: { foo: 'bar' },
      };

      service.sendNotification('user-123', notification);

      expect(socket.emit).toHaveBeenCalledWith('notification', notification);
    });

    it('should not emit notification if user not connected', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);
      socket.data.userId = 'user-other';

      const notification = {
        type: 'alert',
        title: 'Test',
        message: 'Test message',
      };

      // Clear previous calls
      socket.emit.mockClear();

      service.sendNotification('user-123', notification);

      // Should not emit notification (user-123 not connected)
      expect(socket.emit).not.toHaveBeenCalledWith('notification', notification);
    });

    it('should emit bookmark:synced to user on sendBookmarkSync', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);
      socket.data.userId = 'user-123';

      service.sendBookmarkSync('user-123', 'article-1', 'added');

      expect(socket.emit).toHaveBeenCalledWith('bookmark:synced', {
        articleId: 'article-1',
        action: 'added',
      });
    });

    it('should include action (added/removed) in bookmark sync', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket = createMockSocket('client-1');
      triggerConnection(socket);
      socket.data.userId = 'user-456';

      service.sendBookmarkSync('user-456', 'article-2', 'removed');

      expect(socket.emit).toHaveBeenCalledWith('bookmark:synced', {
        articleId: 'article-2',
        action: 'removed',
      });
    });
  });

  describe('Shutdown', () => {
    it('should emit shutdown notification to all clients', async () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      await service.shutdown();

      expect(mockIo.emit).toHaveBeenCalledWith('notification', {
        type: 'system',
        title: 'Server Maintenance',
        message: 'Server is restarting. Please reconnect shortly.',
      });
    });

    it('should close io server on shutdown', async () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      await service.shutdown();

      expect(mockIo.close).toHaveBeenCalled();
    });

    it('should clear connectedClients Map on shutdown', async () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const socket1 = createMockSocket('client-1');
      const socket2 = createMockSocket('client-2');
      triggerConnection(socket1);
      triggerConnection(socket2);
      expect(service.getClientCount()).toBe(2);

      await service.shutdown();

      expect(service.getClientCount()).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should do nothing on broadcastNewArticle when not initialized', () => {
      const service = WebSocketService.getInstance();
      // Not initialized

      expect(() => service.broadcastNewArticle(mockArticle)).not.toThrow();
      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('should do nothing on broadcastBreakingNews when not initialized', () => {
      const service = WebSocketService.getInstance();

      expect(() => service.broadcastBreakingNews(mockArticle)).not.toThrow();
    });

    it('should do nothing on broadcastNewEvent when not initialized', () => {
      const service = WebSocketService.getInstance();

      expect(() => service.broadcastNewEvent(mockEvent)).not.toThrow();
    });

    it('should do nothing on sendNotification when not initialized', () => {
      const service = WebSocketService.getInstance();

      expect(() =>
        service.sendNotification('user-1', { type: 'test', title: 'T', message: 'M' })
      ).not.toThrow();
    });

    it('should do nothing on shutdown when not initialized', async () => {
      const service = WebSocketService.getInstance();

      await expect(service.shutdown()).resolves.toBeUndefined();
    });

    it('should handle event without location.region', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const eventWithoutRegion: GeoEvent = {
        id: 'event-2',
        title: 'Test Event 2',
        description: 'Description',
        location: { lat: 10, lng: 20 }, // No region
        severity: 'low',
        category: 'political',
        date: new Date(),
        sources: [],
      } as GeoEvent;

      // Clear mock
      mockIo.to.mockClear();
      mockIo.emit.mockClear();

      service.broadcastNewEvent(eventWithoutRegion);

      // Should emit event:new but not emit to any region room
      expect(mockIo.emit).toHaveBeenCalledWith('event:new', eventWithoutRegion);
      expect(mockIo.to).not.toHaveBeenCalled();
    });

    it('should do nothing on broadcastSeverityChange when not initialized', () => {
      const service = WebSocketService.getInstance();

      expect(() => service.broadcastSeverityChange('event-1', 'low', 'high')).not.toThrow();
    });

    it('should do nothing on broadcastTensionIndex when not initialized', () => {
      const service = WebSocketService.getInstance();

      expect(() => service.broadcastTensionIndex(50, 10)).not.toThrow();
    });

    it('should do nothing on broadcastClusterUpdate when not initialized', () => {
      const service = WebSocketService.getInstance();

      expect(() => service.broadcastClusterUpdate('topic', 5)).not.toThrow();
    });

    it('should do nothing on broadcastStats when not initialized', () => {
      const service = WebSocketService.getInstance();

      expect(() => service.broadcastStats()).not.toThrow();
    });

    it('should do nothing on sendBookmarkSync when not initialized', () => {
      const service = WebSocketService.getInstance();

      expect(() => service.sendBookmarkSync('user-1', 'article-1', 'added')).not.toThrow();
    });

    it('should handle event without location object', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const eventWithoutLocation: GeoEvent = {
        id: 'event-3',
        title: 'Test Event 3',
        description: 'Description',
        severity: 'low',
        category: 'political',
        date: new Date(),
        sources: [],
      } as GeoEvent;

      // Clear mock
      mockIo.to.mockClear();
      mockIo.emit.mockClear();

      service.broadcastNewEvent(eventWithoutLocation);

      // Should emit event:new but not emit to any region room
      expect(mockIo.emit).toHaveBeenCalledWith('event:new', eventWithoutLocation);
      expect(mockIo.to).not.toHaveBeenCalled();
    });

    it('should handle article with empty topics array', () => {
      const service = WebSocketService.getInstance();
      service.initialize({} as HttpServer);

      const articleNoTopics: NewsArticle = {
        ...mockArticle,
        topics: [],
      };

      // Clear mock
      mockIo.to.mockClear();
      mockIo.emit.mockClear();

      service.broadcastNewArticle(articleNoTopics);

      // Should emit to all and region, but no topic rooms (empty array)
      expect(mockIo.emit).toHaveBeenCalledWith('news:new', articleNoTopics);
      expect(mockIo.to).toHaveBeenCalledWith('region:western');
      // Should only call to() once for region, not for topics
      expect(mockIo.to).toHaveBeenCalledTimes(1);
    });
  });
});
