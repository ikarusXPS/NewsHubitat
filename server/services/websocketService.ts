/**
 * WebSocket Service
 * Real-time updates for news, events, and notifications
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';
import type { NewsArticle, GeoEvent } from '../../src/types';

// Event types for type-safe communication
export interface ServerToClientEvents {
  // News updates
  'news:new': (article: NewsArticle) => void;
  'news:updated': (article: Partial<NewsArticle> & { id: string }) => void;
  'news:breaking': (article: NewsArticle) => void;

  // Event updates
  'event:new': (event: GeoEvent) => void;
  'event:updated': (event: Partial<GeoEvent> & { id: string }) => void;
  'event:severity-change': (data: { eventId: string; oldSeverity: string; newSeverity: string }) => void;

  // Analysis updates
  'analysis:cluster-updated': (data: { topic: string; articleCount: number }) => void;
  'analysis:tension-index': (data: { value: number; change: number }) => void;

  // User-specific
  'notification': (data: { type: string; title: string; message: string; data?: unknown }) => void;
  'bookmark:synced': (data: { articleId: string; action: 'added' | 'removed' }) => void;

  // Comment events (Phase 27)
  'comment:new': (data: { articleId: string; comment: CommentWithUser }) => void;
  'comment:typing': (data: { articleId: string }) => void;

  // System
  'connected': (data: { clientId: string; serverTime: number }) => void;
  'stats': (data: { connectedClients: number; activeRooms: string[] }) => void;
}

export interface ClientToServerEvents {
  // Room subscriptions
  'subscribe:region': (region: string) => void;
  'unsubscribe:region': (region: string) => void;
  'subscribe:topic': (topic: string) => void;
  'unsubscribe:topic': (topic: string) => void;

  // Article room subscriptions (Phase 27)
  'subscribe:article': (articleId: string) => void;
  'unsubscribe:article': (articleId: string) => void;
  'comment:typing:start': (articleId: string) => void;
  'comment:typing:stop': (articleId: string) => void;

  // User authentication
  'authenticate': (token: string) => void;

  // Presence
  'ping': () => void;
}

interface SocketData {
  userId?: string;
  subscribedRegions: Set<string>;
  subscribedTopics: Set<string>;
  authenticatedAt?: Date;
}

// Comment with user info for real-time broadcasts (Phase 27)
export interface CommentWithUser {
  id: string;
  text: string;
  userId: string;
  articleId: string;
  parentId: string | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  isDeleted: boolean;
  isEdited: boolean;
  isFlagged: boolean;
  aiModerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> | null = null;
  private connectedClients = new Map<string, Socket>();

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    logger.info('✓ WebSocket server initialized');
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      const clientId = socket.id;

      // Initialize socket data
      socket.data.subscribedRegions = new Set();
      socket.data.subscribedTopics = new Set();

      this.connectedClients.set(clientId, socket);
      logger.debug(`WebSocket client connected: ${clientId}`);

      // Send connection confirmation
      socket.emit('connected', {
        clientId,
        serverTime: Date.now(),
      });

      // Handle region subscription
      socket.on('subscribe:region', (region) => {
        socket.join(`region:${region}`);
        socket.data.subscribedRegions.add(region);
        logger.debug(`Client ${clientId} subscribed to region: ${region}`);
      });

      socket.on('unsubscribe:region', (region) => {
        socket.leave(`region:${region}`);
        socket.data.subscribedRegions.delete(region);
      });

      // Handle topic subscription
      socket.on('subscribe:topic', (topic) => {
        socket.join(`topic:${topic}`);
        socket.data.subscribedTopics.add(topic);
        logger.debug(`Client ${clientId} subscribed to topic: ${topic}`);
      });

      socket.on('unsubscribe:topic', (topic) => {
        socket.leave(`topic:${topic}`);
        socket.data.subscribedTopics.delete(topic);
      });

      // Article room subscriptions for comments (Phase 27)
      socket.on('subscribe:article', (articleId) => {
        socket.join(`article:${articleId}`);
        logger.debug(`Client ${clientId} subscribed to article:${articleId}`);
      });

      socket.on('unsubscribe:article', (articleId) => {
        socket.leave(`article:${articleId}`);
        logger.debug(`Client ${clientId} unsubscribed from article:${articleId}`);
      });

      // Comment typing indicators (Phase 27)
      let typingTimeout: NodeJS.Timeout | null = null;

      socket.on('comment:typing:start', (articleId) => {
        // Broadcast to other users in the article room (excludes sender)
        socket.to(`article:${articleId}`).emit('comment:typing', { articleId });

        // Clear existing timeout
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }

        // Auto-stop after 2s of inactivity
        typingTimeout = setTimeout(() => {
          // Typing stopped implicitly
        }, 2000);
      });

      socket.on('comment:typing:stop', (articleId) => {
        if (typingTimeout) {
          clearTimeout(typingTimeout);
          typingTimeout = null;
        }
        // Note: articleId is available if we need to track per-article typing state
        void articleId;
      });

      // Handle authentication
       
      socket.on('authenticate', (_token: string) => {
        // TODO: Verify JWT token and set userId
        try {
          // const decoded = verifyToken(_token);
          // socket.data.userId = decoded.userId;
          socket.data.authenticatedAt = new Date();
          socket.join('authenticated');
          logger.debug(`Client ${clientId} authenticated`);
        } catch {
          logger.debug(`Client ${clientId} authentication failed`);
        }
      });

      // Handle ping (keep-alive)
      socket.on('ping', () => {
        // Connection is alive, no response needed
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(clientId);
        logger.debug(`WebSocket client disconnected: ${clientId} (${reason})`);
      });
    });
  }

  /**
   * Check if WebSocket is available
   */
  isAvailable(): boolean {
    return this.io !== null;
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Broadcast new article to all clients and relevant rooms
   */
  broadcastNewArticle(article: NewsArticle): void {
    if (!this.io) return;

    // Broadcast to all
    this.io.emit('news:new', article);

    // Broadcast to region room
    this.io.to(`region:${article.perspective}`).emit('news:new', article);

    // Broadcast to topic rooms
    for (const topic of article.topics) {
      this.io.to(`topic:${topic}`).emit('news:new', article);
    }
  }

  /**
   * Broadcast breaking news (high priority)
   */
  broadcastBreakingNews(article: NewsArticle): void {
    if (!this.io) return;
    this.io.emit('news:breaking', article);
  }

  /**
   * Broadcast new geo event
   */
  broadcastNewEvent(event: GeoEvent): void {
    if (!this.io) return;

    this.io.emit('event:new', event);

    // Broadcast to region if available
    if (event.location?.region) {
      this.io.to(`region:${event.location.region}`).emit('event:new', event);
    }
  }

  /**
   * Broadcast event severity change
   */
  broadcastSeverityChange(eventId: string, oldSeverity: string, newSeverity: string): void {
    if (!this.io) return;

    this.io.emit('event:severity-change', {
      eventId,
      oldSeverity,
      newSeverity,
    });
  }

  /**
   * Broadcast tension index update
   */
  broadcastTensionIndex(value: number, change: number): void {
    if (!this.io) return;
    this.io.emit('analysis:tension-index', { value, change });
  }

  /**
   * Broadcast cluster update
   */
  broadcastClusterUpdate(topic: string, articleCount: number): void {
    if (!this.io) return;
    this.io.emit('analysis:cluster-updated', { topic, articleCount });
  }

  /**
   * Send notification to specific user
   */
  sendNotification(
    userId: string,
    notification: { type: string; title: string; message: string; data?: unknown }
  ): void {
    if (!this.io) return;

    // Find sockets for this user
    for (const [, socket] of this.connectedClients) {
      if (socket.data.userId === userId) {
        socket.emit('notification', notification);
      }
    }
  }

  /**
   * Send bookmark sync to user
   */
  sendBookmarkSync(userId: string, articleId: string, action: 'added' | 'removed'): void {
    if (!this.io) return;

    for (const [, socket] of this.connectedClients) {
      if (socket.data.userId === userId) {
        socket.emit('bookmark:synced', { articleId, action });
      }
    }
  }

  /**
   * Broadcast server stats (for admin/monitoring)
   */
  broadcastStats(): void {
    if (!this.io) return;

    const rooms = Array.from(this.io.sockets.adapter.rooms.keys())
      .filter((room) => room.startsWith('region:') || room.startsWith('topic:'));

    this.io.to('authenticated').emit('stats', {
      connectedClients: this.connectedClients.size,
      activeRooms: rooms,
    });
  }

  /**
   * Broadcast new comment to article room (Phase 27)
   */
  broadcastNewComment(articleId: string, comment: CommentWithUser): void {
    if (!this.io) return;

    this.io.to(`article:${articleId}`).emit('comment:new', {
      articleId,
      comment,
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.io) {
      // Notify all clients
      this.io.emit('notification', {
        type: 'system',
        title: 'Server Maintenance',
        message: 'Server is restarting. Please reconnect shortly.',
      });

      // Close all connections
      await this.io.close();
      this.io = null;
      this.connectedClients.clear();
      logger.info('WebSocket server shut down');
    }
  }
}

export default WebSocketService;
