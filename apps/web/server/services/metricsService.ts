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

  // Pool metrics (D-14 - Phase 34)
  public dbPoolTotal: Gauge<string>;
  public dbPoolIdle: Gauge<string>;
  public dbPoolWaiting: Gauge<string>;

  // Prisma pool metrics (DB-04 - Phase 37) — naming aligns with PgBouncer exporter
  // sibling gauges (pgbouncer_pools_*) so Grafana dashboards can correlate client-pool
  // (prisma_pool_*) with backend-pool (pgbouncer_pools_*) saturation side-by-side.
  public prismaPoolTotal: Gauge<string>;
  public prismaPoolIdle: Gauge<string>;
  public prismaPoolWaiting: Gauge<string>;

  // Email metrics (D-11, D-12 - Phase 22)
  public emailSentTotal: Counter<string>;
  public emailDeliveredTotal: Counter<string>;
  public emailBouncedTotal: Counter<string>;
  public emailComplainedTotal: Counter<string>;
  public emailDeliverySuccessRate: Gauge<string>;

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

    // Database pool metrics (D-14 - Phase 34)
    this.dbPoolTotal = new Gauge({
      name: 'db_pool_total_connections',
      help: 'Total connections in database pool',
      registers: [this.registry],
    });

    this.dbPoolIdle = new Gauge({
      name: 'db_pool_idle_connections',
      help: 'Idle connections in database pool',
      registers: [this.registry],
    });

    this.dbPoolWaiting = new Gauge({
      name: 'db_pool_waiting_requests',
      help: 'Requests waiting for database connection',
      registers: [this.registry],
    });

    // Prisma pool metrics (DB-04 - Phase 37): canonical names exposed alongside
    // legacy db_pool_* gauges. Plan 04 wires Grafana dashboards to these names.
    this.prismaPoolTotal = new Gauge({
      name: 'prisma_pool_total',
      help: 'Prisma client pool total connections (DB-04)',
      registers: [this.registry],
    });

    this.prismaPoolIdle = new Gauge({
      name: 'prisma_pool_idle',
      help: 'Prisma client pool idle connections',
      registers: [this.registry],
    });

    this.prismaPoolWaiting = new Gauge({
      name: 'prisma_pool_waiting',
      help: 'Prisma client pool requests waiting for a connection',
      registers: [this.registry],
    });

    // Email counters (D-11 - Phase 22)
    this.emailSentTotal = new Counter({
      name: 'email_sent_total',
      help: 'Total number of emails sent',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.emailDeliveredTotal = new Counter({
      name: 'email_delivered_total',
      help: 'Total number of emails delivered',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.emailBouncedTotal = new Counter({
      name: 'email_bounced_total',
      help: 'Total number of bounced emails',
      labelNames: ['type', 'bounce_type'],
      registers: [this.registry],
    });

    this.emailComplainedTotal = new Counter({
      name: 'email_complained_total',
      help: 'Total number of spam complaints',
      labelNames: ['type'],
      registers: [this.registry],
    });

    // Email delivery success rate gauge (D-12 - Phase 22)
    this.emailDeliverySuccessRate = new Gauge({
      name: 'email_delivery_success_rate',
      help: 'Email delivery success rate (delivered/sent)',
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

  /**
   * Update database pool metrics (D-14 - Phase 34, DB-04 - Phase 37)
   *
   * Writes to both legacy db_pool_* gauges and canonical prisma_pool_* gauges.
   * Phase 37 introduced the prisma_pool_* names so dashboards can pair Prisma
   * client-pool stats with PgBouncer backend-pool stats (pgbouncer_pools_*).
   */
  updatePoolMetrics(stats: { totalCount: number; idleCount: number; waitingCount: number }): void {
    // Legacy gauges (Phase 34 — kept for existing Grafana panels)
    this.dbPoolTotal.set(stats.totalCount);
    this.dbPoolIdle.set(stats.idleCount);
    this.dbPoolWaiting.set(stats.waitingCount);

    // Canonical Prisma pool gauges (DB-04, Phase 37)
    this.prismaPoolTotal.set(stats.totalCount);
    this.prismaPoolIdle.set(stats.idleCount);
    this.prismaPoolWaiting.set(stats.waitingCount);
  }

  /**
   * Increment email sent counter (D-11 - Phase 22)
   */
  incrementEmailSent(type: string): void {
    this.emailSentTotal.inc({ type });
    this.updateDeliveryRate();
  }

  /**
   * Increment email delivered counter (D-11 - Phase 22)
   */
  incrementEmailDelivered(type: string): void {
    this.emailDeliveredTotal.inc({ type });
    this.updateDeliveryRate();
  }

  /**
   * Increment email bounced counter (D-11 - Phase 22)
   */
  incrementEmailBounced(type: string, bounceType: 'hard' | 'soft' | 'blocked'): void {
    this.emailBouncedTotal.inc({ type, bounce_type: bounceType });
    this.updateDeliveryRate();
  }

  /**
   * Increment email complained counter (D-11 - Phase 22)
   */
  incrementEmailComplained(type: string): void {
    this.emailComplainedTotal.inc({ type });
  }

  /**
   * Update delivery success rate gauge (D-12 - Phase 22)
   */
  private async updateDeliveryRate(): Promise<void> {
    try {
      const sent = await this.emailSentTotal.get();
      const delivered = await this.emailDeliveredTotal.get();

      const totalSent = sent.values.reduce((sum, v) => sum + v.value, 0);
      const totalDelivered = delivered.values.reduce((sum, v) => sum + v.value, 0);

      const rate = totalSent > 0 ? totalDelivered / totalSent : 1.0;
      this.emailDeliverySuccessRate.set(rate);
    } catch (_err) {
      // Ignore errors during rate calculation
    }
  }
}

export default MetricsService;
