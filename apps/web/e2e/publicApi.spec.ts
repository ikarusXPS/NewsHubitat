/**
 * Public API E2E Tests (Phase 35, Plan 05)
 *
 * Verifies:
 * - API key authentication (valid, invalid, missing, revoked)
 * - Tiered rate limiting (free 10/min, pro 100/min)
 * - RateLimit-* headers and Retry-After
 * - Public API endpoints (news, events, sentiment)
 * - Cache-Control headers
 * - OpenAPI spec served without auth
 *
 * Reference: D-06 (X-API-Key), D-15 (rate limits), D-13 (IETF headers)
 */
/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test';

// Extend base test to add API request context
const test = base.extend<{
  apiRequestContext: ReturnType<typeof base.request.newContext> extends Promise<infer T> ? T : never;
}>({
  apiRequestContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: 'http://127.0.0.1:3001',
    });
    await use(context);
    await context.dispose();
  },
});

// Test user credentials (same as auth.setup.ts)
const TEST_EMAIL = 'publicapi-e2e@newshub.test';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'PublicAPI Test User';

let authToken: string;
let testApiKey: string;
let testApiKeyId: string;

// Force serial execution: tests share module-scope state (`authToken`, `testApiKey`,
// `testApiKeyId`) populated by an earlier test. With the project-wide
// `fullyParallel: true` setting, describe blocks would split across 4 workers and
// the shared variables would be undefined in worker N>0, causing every dependent
// test to 401.
test.describe.configure({ mode: 'serial' });

test.describe('Public API', () => {
  test.beforeAll(async ({ request }) => {
    // Register test user (idempotent - skip if exists)
    try {
      await request.post('http://127.0.0.1:3001/api/auth/register', {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
      });
    } catch {
      // User may already exist
    }

    // Login to get auth token
    const loginResponse = await request.post('http://127.0.0.1:3001/api/auth/login', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      authToken = loginData.data?.token || loginData.token;
    }
  });

  test.describe('API Key Management via API', () => {
    test('should create API key', async ({ request }) => {
      const response = await request.post('http://127.0.0.1:3001/api/keys', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          name: 'E2E Test Key',
          tier: 'free',
          environment: 'live',
        },
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.key).toMatch(/^nh_live_[0-9A-Za-z]{24}_[0-9A-F]{4}$/);
      expect(data.message).toContain("won't see it again");

      // Store for subsequent tests
      testApiKey = data.data.key;
      testApiKeyId = data.data.keyData.id;
    });

    test('should list user API keys', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/keys', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      // Verify key metadata structure (no hash exposed)
      const key = data.data[0];
      expect(key).toHaveProperty('id');
      expect(key).toHaveProperty('name');
      expect(key).toHaveProperty('tier');
      expect(key).toHaveProperty('environment');
      expect(key).toHaveProperty('createdAt');
      expect(key).toHaveProperty('lastUsedAt');
      expect(key).toHaveProperty('requestCount');
      expect(key).not.toHaveProperty('keyHash');
    });
  });

  test.describe('API Authentication', () => {
    test('should allow access with valid API key', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news', {
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toHaveProperty('total');
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('limit');
    });

    test('should return 401 for missing API key', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news');

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing X-API-Key');
    });

    test('should return 401 for invalid API key format', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news', {
        headers: {
          'X-API-Key': 'invalid-key-format',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    test('should return 401 for invalid API key checksum', async ({ request }) => {
      // Valid format but wrong checksum
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news', {
        headers: {
          'X-API-Key': 'nh_live_1234567890123456789012AB_DEAD',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should include rate limit headers', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news', {
        headers: {
          'X-API-Key': testApiKey,
        },
      });

      expect(response.status()).toBe(200);

      // IETF RateLimit headers (D-13)
      const headers = response.headers();
      expect(headers['ratelimit-limit']).toBeDefined();
      expect(headers['ratelimit-remaining']).toBeDefined();
      expect(headers['ratelimit-reset']).toBeDefined();
    });

    test('should enforce free tier rate limit (10 req/min)', async ({ request }) => {
      // Create a fresh API key for this test to avoid pollution from other tests
      const createResponse = await request.post('http://127.0.0.1:3001/api/keys', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          name: 'Rate Limit Test Key',
          tier: 'free',
          environment: 'live',
        },
      });

      const createData = await createResponse.json();
      const rateLimitTestKey = createData.data.key;
      const rateLimitTestKeyId = createData.data.keyData.id;

      // Make 10 requests (should all succeed)
      for (let i = 0; i < 10; i++) {
        const response = await request.get('http://127.0.0.1:3001/api/v1/public/news?limit=1', {
          headers: { 'X-API-Key': rateLimitTestKey },
        });
        expect(response.status()).toBe(200);
      }

      // 11th request should be rate limited
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news?limit=1', {
        headers: { 'X-API-Key': rateLimitTestKey },
      });

      expect(response.status()).toBe(429);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Rate limit exceeded');
      expect(data.tier).toBe('free');
      expect(data.limit).toBe(10);

      // Clean up: revoke the test key
      await request.delete(`http://127.0.0.1:3001/api/keys/${rateLimitTestKeyId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    });

    test('should include Retry-After header on 429', async ({ request }) => {
      // Create a fresh key for this test
      const createResponse = await request.post('http://127.0.0.1:3001/api/keys', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          name: 'Retry After Test Key',
          tier: 'free',
          environment: 'live',
        },
      });

      const createData = await createResponse.json();
      const retryAfterTestKey = createData.data.key;
      const retryAfterTestKeyId = createData.data.keyData.id;

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await request.get('http://127.0.0.1:3001/api/v1/public/news?limit=1', {
          headers: { 'X-API-Key': retryAfterTestKey },
        });
      }

      // Get 429 response and check Retry-After
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news', {
        headers: { 'X-API-Key': retryAfterTestKey },
      });

      expect(response.status()).toBe(429);
      expect(response.headers()['retry-after']).toBeDefined();

      const retryAfter = parseInt(response.headers()['retry-after']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);

      // Clean up
      await request.delete(`http://127.0.0.1:3001/api/keys/${retryAfterTestKeyId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    });
  });

  test.describe('Public API Endpoints', () => {
    test('should return news articles with filters', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news?regions=usa&limit=5', {
        headers: { 'X-API-Key': testApiKey },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(5);
      expect(data.meta).toHaveProperty('total');
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('limit');
      expect(data.meta).toHaveProperty('hasMore');

      // Verify article schema if articles exist
      if (data.data.length > 0) {
        const article = data.data[0];
        expect(article).toHaveProperty('id');
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('sourceId');
      }
    });

    test('should return single article by ID', async ({ request }) => {
      // Get first article from list
      const listResponse = await request.get('http://127.0.0.1:3001/api/v1/public/news?limit=1', {
        headers: { 'X-API-Key': testApiKey },
      });
      const listData = await listResponse.json();

      if (listData.data.length === 0) {
        test.skip();
        return;
      }

      const articleId = listData.data[0].id;

      // Fetch individual article
      const response = await request.get(`http://127.0.0.1:3001/api/v1/public/news/${articleId}`, {
        headers: { 'X-API-Key': testApiKey },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(articleId);
    });

    test('should return 404 for non-existent article', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news/non-existent-article-id-12345', {
        headers: { 'X-API-Key': testApiKey },
      });

      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    test('should return geo events', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/events', {
        headers: { 'X-API-Key': testApiKey },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toHaveProperty('total');
    });

    test('should return sentiment statistics', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/sentiment', {
        headers: { 'X-API-Key': testApiKey },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      // Verify stats schema if data exists
      if (data.data.length > 0) {
        const stat = data.data[0];
        expect(stat).toHaveProperty('region');
        expect(stat).toHaveProperty('positive');
        expect(stat).toHaveProperty('negative');
        expect(stat).toHaveProperty('neutral');
        expect(stat).toHaveProperty('total');
      }
    });

    test('should serve OpenAPI spec without auth', async ({ request }) => {
      const response = await request.get('http://127.0.0.1:3001/api/openapi.json');

      expect(response.status()).toBe(200);

      const spec = await response.json();
      expect(spec.openapi).toBe('3.1.0');
      expect(spec.info.title).toContain('NewsHub');
      expect(spec.paths).toHaveProperty('/api/v1/public/news');
    });
  });

  test.describe('Cache Headers', () => {
    // testApiKey accumulates ~9 req across upstream describe blocks; the free
    // tier limit is 10 req/min, so reusing it here trips 429 mid-suite.
    // Mint a fresh key dedicated to this describe block.
    let cacheTestApiKey: string;
    let cacheTestApiKeyId: string;

    test.beforeAll(async ({ request }) => {
      // The 3-key/user cap (D-10) can be exhausted by upstream describes
      // when retries happen; if creation fails, leave keys undefined and
      // tests below will skip rather than throwing TypeError on data.data.
      const create = await request.post('http://127.0.0.1:3001/api/keys', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { name: 'Cache Headers Test Key', tier: 'free', environment: 'live' },
      });
      if (!create.ok()) return;
      const data = await create.json();
      cacheTestApiKey = data?.data?.key;
      cacheTestApiKeyId = data?.data?.keyData?.id;
    });

    test.afterAll(async ({ request }) => {
      if (cacheTestApiKeyId) {
        await request.delete(`http://127.0.0.1:3001/api/keys/${cacheTestApiKeyId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
      }
    });

    test('should set Cache-Control headers on news list', async ({ request }) => {
      test.skip(!cacheTestApiKey, 'Could not provision cache-test API key (3-key cap)');
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/news', {
        headers: { 'X-API-Key': cacheTestApiKey },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['cache-control']).toContain('max-age=300');
    });

    test('should set Cache-Control headers on single article', async ({ request }) => {
      test.skip(!cacheTestApiKey, 'Could not provision cache-test API key (3-key cap)');
      const listResponse = await request.get('http://127.0.0.1:3001/api/v1/public/news?limit=1', {
        headers: { 'X-API-Key': cacheTestApiKey },
      });
      const listData = await listResponse.json();

      if (listData.data.length === 0) {
        test.skip();
        return;
      }

      const response = await request.get(`http://127.0.0.1:3001/api/v1/public/news/${listData.data[0].id}`, {
        headers: { 'X-API-Key': cacheTestApiKey },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['cache-control']).toContain('max-age=3600');
    });

    test('should set Cache-Control headers on events', async ({ request }) => {
      test.skip(!cacheTestApiKey, 'Could not provision cache-test API key (3-key cap)');
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/events', {
        headers: { 'X-API-Key': cacheTestApiKey },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['cache-control']).toContain('max-age=900');
    });

    test('should set Cache-Control headers on sentiment', async ({ request }) => {
      test.skip(!cacheTestApiKey, 'Could not provision cache-test API key (3-key cap)');
      const response = await request.get('http://127.0.0.1:3001/api/v1/public/sentiment', {
        headers: { 'X-API-Key': cacheTestApiKey },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['cache-control']).toContain('max-age=600');
    });
  });

  test.describe('API Key Revocation', () => {
    test('should return 401 for revoked API key', async ({ request }) => {
      // Create a key to revoke
      const createResponse = await request.post('http://127.0.0.1:3001/api/keys', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          name: 'Revocation Test Key',
          tier: 'free',
          environment: 'live',
        },
      });

      const createData = await createResponse.json();
      const revokeTestKey = createData.data.key;
      const revokeTestKeyId = createData.data.keyData.id;

      // Verify key works before revocation
      let response = await request.get('http://127.0.0.1:3001/api/v1/public/news?limit=1', {
        headers: { 'X-API-Key': revokeTestKey },
      });
      expect(response.status()).toBe(200);

      // Revoke the key
      await request.delete(`http://127.0.0.1:3001/api/keys/${revokeTestKeyId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Wait for cache to expire (or invalidation) - key is cached 5 min, but revocation should work
      // In practice, revocation should immediately invalidate cached auth
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify key no longer works
      response = await request.get('http://127.0.0.1:3001/api/v1/public/news?limit=1', {
        headers: { 'X-API-Key': revokeTestKey },
      });
      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });
  });

  test.afterAll(async ({ request }) => {
    // Clean up: revoke all test keys
    if (testApiKeyId) {
      await request.delete(`http://127.0.0.1:3001/api/keys/${testApiKeyId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }).catch(() => {});
    }
  });
});
