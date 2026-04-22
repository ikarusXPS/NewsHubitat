import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

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

const prisma = new PrismaClient({ adapter });

export { prisma };
