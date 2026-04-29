/**
 * Seed 100 test users for load testing
 * Usage: npm run seed:load-test
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({ connectionString, max: 10 });
const prisma = new PrismaClient({ adapter });

async function seedLoadTestUsers() {
  const users = [];

  console.log('Creating 100 load test users...');

  // Create 100 test users (D-03)
  for (let i = 1; i <= 100; i++) {
    const email = `loadtest${i}@example.com`;
    const password = 'LoadTest123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: hashedPassword,
        emailVerified: true,  // Skip email verification for load tests
        name: `Load Test User ${i}`,
      },
    });

    users.push({
      email: user.email,
      password,  // Store plain password for k6 (D-24: gitignored)
    });

    if (i % 10 === 0) {
      console.log(`  Created ${i}/100 users...`);
    }
  }

  // Write to k6/data/users.json (D-24: gitignored)
  const outputPath = path.join(__dirname, '..', 'k6', 'data', 'users.json');
  fs.writeFileSync(outputPath, JSON.stringify(users, null, 2));
  console.log(`✅ Seeded ${users.length} load test users to ${outputPath}`);
  console.log('⚠️  Remember: users.json contains plain passwords and is gitignored');

  await prisma.$disconnect();
}

seedLoadTestUsers().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
