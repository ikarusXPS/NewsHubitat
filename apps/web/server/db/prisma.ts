import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({
  connectionString,
  max: 20,                        // Phase 37 / DB-03: 4 web replicas × 20 = 80 client conns into PgBouncer (MAX_CLIENT_CONN=200)
  connectionTimeoutMillis: 5_000, // D-04: Connection timeout = 5 seconds
  idleTimeoutMillis: 300_000,     // D-06: Idle timeout = 5 minutes
  // Note: Prisma 7 + @prisma/adapter-pg recognizes ?pgbouncer=true in connectionString
  // and disables prepared-statement caching automatically (DB-01, Pitfall 1).
  // No explicit code branch needed here — set the flag in DATABASE_URL.
});

// D-09: Gate logging on NODE_ENV !== 'production'
const isDev = process.env.NODE_ENV !== 'production';

// D-06, D-07: Enable query and warn log levels in development only
const prisma = new PrismaClient({
  adapter,
  log: isDev
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'warn' },
      ]
    : [],
});

// D-08: Log format includes query duration for identifying slow queries
if (isDev) {
  prisma.$on('query', (e: Prisma.QueryEvent) => {
    const duration = e.duration;
    const query = e.query;

    // Color-code slow queries (>100ms) for visibility
    if (duration > 100) {
      console.warn(`[Prisma SLOW ${duration}ms] ${query}`);
    } else {
      console.log(`[Prisma ${duration}ms] ${query}`);
    }

    // Log params for debugging (truncate long values)
    if (e.params && e.params !== '[]') {
      const params = e.params.length > 200
        ? e.params.slice(0, 200) + '...'
        : e.params;
      console.log(`  Params: ${params}`);
    }
  });
}

/**
 * Get connection pool statistics for Prometheus metrics (D-14 - Phase 34)
 * Note: PrismaPg wraps pg-pool; direct access may be limited
 */
export function getPoolStats(): { totalCount: number; idleCount: number; waitingCount: number } | null {
  try {
    // Attempt to access pool from adapter internals
    // PrismaPg uses @prisma/driver-adapter-utils which may expose pool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapterAny = adapter as any;

    // Check common patterns for pool access
    const pool = adapterAny.pool || adapterAny._pool || adapterAny.client?.pool;

    if (pool && typeof pool.totalCount === 'number') {
      return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount ?? 0,
        waitingCount: pool.waitingCount ?? 0,
      };
    }

    // Fallback: return null to indicate unavailable
    return null;
  } catch {
    return null;
  }
}

export { prisma };
