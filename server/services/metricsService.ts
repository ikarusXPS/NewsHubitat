/**
 * Prometheus Metrics Service (D-01, D-02)
 * Centralized metrics registry and metric creation following project singleton pattern
 */

import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import logger from '../utils/logger';

export class MetricsService {
  private static instance: MetricsService;
  private registry: Registry;

  // HTTP metrics (D-05, D-07, D-08, D-09)
  public httpRequestDuration: Histogram<string>;
  public httpRequestsTotal: Counter<string>;

  // Service metrics (D-11, D-12, D-13)
  public upGauge: Gauge<string>;
  public websocketConnections: Gauge<string>;
  public dbConnectionsActive: Gauge<string>;
  public redisConnectionsActive: Gauge<string>;

  private constructor() {
    this.registry = new Registry();

    // Default Node.js metrics (D-04: 10s collection interval)
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'newshub_',
    });

    // HTTP request duration histogram (D-07, D-08)
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // HTTP request counter (D-05, D-09)
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Service up gauge (D-13)
    this.upGauge = new Gauge({
      name: 'up',
      help: 'Service up status',
      labelNames: ['service'],
      registers: [this.registry],
    });
    this.upGauge.set({ service: 'newshub' }, 1);

    // WebSocket connections (D-12)
    this.websocketConnections = new Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });

    // DB connections (D-11)
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    // Redis connections (D-11)
    this.redisConnectionsActive = new Gauge({
      name: 'redis_connections_active',
      help: 'Number of active Redis connections',
      registers: [this.registry],
    });

    logger.info('MetricsService initialized');
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Update WebSocket connection gauge
   */
  setWebSocketConnections(count: number): void {
    this.websocketConnections.set(count);
  }

  /**
   * Update DB connection gauge
   */
  setDbConnections(count: number): void {
    this.dbConnectionsActive.set(count);
  }

  /**
   * Update Redis connection gauge
   */
  setRedisConnections(count: number): void {
    this.redisConnectionsActive.set(count);
  }
}

export default MetricsService;
