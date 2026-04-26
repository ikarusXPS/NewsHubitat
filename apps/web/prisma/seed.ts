import 'dotenv/config';
import { prisma } from '../server/db/prisma';
import { seedBadges } from './seed-badges';
import { seedPersonas } from './seed-personas';

async function main(): Promise<void> {
  console.log('Starting database seeding...\n');

  await seedBadges();
  console.log('');
  await seedPersonas();

  console.log('\nSeeding complete!');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
