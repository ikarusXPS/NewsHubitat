import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({
  connectionString,
  max: 10,                        // D-02: Pool size = 10 connections
  connectionTimeoutMillis: 5_000, // D-04: Connection timeout = 5 seconds
  idleTimeoutMillis: 300_000,     // D-06: Idle timeout = 5 minutes
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

export { prisma };
