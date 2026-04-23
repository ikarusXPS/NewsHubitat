/**
 * Unit tests for MetricsService
 * Tests singleton pattern, metric creation, and metrics output
 */

import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';

// Mock prom-client before importing MetricsService
const mockHistogram = {
  observe: vi.fn(),
  startTimer: vi.fn().mockReturnValue(vi.fn()),
};
const mockCounter = {
  inc: vi.fn(),
};
const mockGauge = {
  set: vi.fn(),
};
const mockRegistry = {
  metrics: vi.fn().mockResolvedValue('# HELP http_requests_total Total number of HTTP requests\n'),
  contentType: 'text/plain; version=0.0.4; charset=utf-8',
};

vi.mock('prom-client', () => {
  return {
    Registry: class MockRegistry {
      metrics = mockRegistry.metrics;
      contentType = mockRegistry.contentType;
    },
    Counter: class MockCounter {
      inc = mockCounter.inc;
    },
    Gauge: class MockGauge {
      set = mockGauge.set;
    },
    Histogram: class MockHistogram {
      observe = mockHistogram.observe;
      startTimer = mockHistogram.startTimer;
    },
    collectDefaultMetrics: vi.fn(),
  };
});

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { MetricsService } from './metricsService';

describe('MetricsService', () => {
  beforeEach(() => {
    // Reset singleton between tests
    (MetricsService as unknown as { instance: MetricsService | null }).instance = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = MetricsService.getInstance();
      const instance2 = MetricsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getMetrics', () => {
    it('returns prometheus format string', async () => {
      const service = MetricsService.getInstance();
      const metrics = await service.getMetrics();
      expect(metrics).toContain('# HELP');
    });
  });

  describe('getContentType', () => {
    it('returns prometheus content type', () => {
      const service = MetricsService.getInstance();
      const contentType = service.getContentType();
      expect(contentType).toContain('text/plain');
    });
  });

  describe('httpRequestDuration', () => {
    it('is a histogram metric', () => {
      const service = MetricsService.getInstance();
      expect(service.httpRequestDuration).toBeDefined();
      expect(service.httpRequestDuration.observe).toBeDefined();
    });
  });

  describe('httpRequestsTotal', () => {
    it('is a counter metric', () => {
      const service = MetricsService.getInstance();
      expect(service.httpRequestsTotal).toBeDefined();
      expect(service.httpRequestsTotal.inc).toBeDefined();
    });
  });

  describe('setWebSocketConnections', () => {
    it('updates websocket gauge', () => {
      const service = MetricsService.getInstance();
      service.setWebSocketConnections(42);
      expect(service.websocketConnections.set).toHaveBeenCalledWith(42);
    });
  });

  describe('setDbConnections', () => {
    it('updates db connections gauge', () => {
      const service = MetricsService.getInstance();
      service.setDbConnections(10);
      expect(service.dbConnectionsActive.set).toHaveBeenCalledWith(10);
    });
  });

  describe('setRedisConnections', () => {
    it('updates redis connections gauge', () => {
      const service = MetricsService.getInstance();
      service.setRedisConnections(5);
      expect(service.redisConnectionsActive.set).toHaveBeenCalledWith(5);
    });
  });
});
