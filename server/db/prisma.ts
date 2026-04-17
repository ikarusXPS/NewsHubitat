import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

// Use absolute path for SQLite database
const dbPath = path.resolve(process.cwd(), 'dev.db');

// In Prisma 7, the adapter takes a config object with url
const adapter = new PrismaBetterSqlite3({ 
  url: `file:${dbPath}` 
});

const prisma = new PrismaClient({ adapter });

export { prisma };
