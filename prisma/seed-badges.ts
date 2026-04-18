import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

// Badge definitions per D-41, D-42, D-45
const BADGE_SEEDS = [
  // Volume badges - Bookworm
  { name: 'Bookworm-bronze', description: 'Read 10 articles', tier: 'bronze', category: 'volume', iconType: 'book-open', threshold: 10 },
  { name: 'Bookworm-silver', description: 'Read 50 articles', tier: 'silver', category: 'volume', iconType: 'book-open', threshold: 50 },
  { name: 'Bookworm-gold', description: 'Read 100 articles', tier: 'gold', category: 'volume', iconType: 'book-open', threshold: 100 },
  { name: 'Bookworm-platinum', description: 'Read 500 articles', tier: 'platinum', category: 'volume', iconType: 'book-open', threshold: 500 },

  // Volume badges - Scholar
  { name: 'Scholar-bronze', description: 'Read 100 articles', tier: 'bronze', category: 'volume', iconType: 'graduation-cap', threshold: 100 },
  { name: 'Scholar-silver', description: 'Read 250 articles', tier: 'silver', category: 'volume', iconType: 'graduation-cap', threshold: 250 },
  { name: 'Scholar-gold', description: 'Read 500 articles', tier: 'gold', category: 'volume', iconType: 'graduation-cap', threshold: 500 },
  { name: 'Scholar-platinum', description: 'Read 1000 articles', tier: 'platinum', category: 'volume', iconType: 'graduation-cap', threshold: 1000 },

  // Diversity badges - Global Perspective Reader
  { name: 'Global Perspective Reader-bronze', description: 'Read from 3 regions', tier: 'bronze', category: 'diversity', iconType: 'globe', threshold: 3 },
  { name: 'Global Perspective Reader-silver', description: 'Read from 4 regions', tier: 'silver', category: 'diversity', iconType: 'globe', threshold: 4 },
  { name: 'Global Perspective Reader-gold', description: 'Read from 5 regions', tier: 'gold', category: 'diversity', iconType: 'globe', threshold: 5 },
  { name: 'Global Perspective Reader-platinum', description: 'Read from all 6 regions', tier: 'platinum', category: 'diversity', iconType: 'globe', threshold: 6 },

  // Behavior badges - streaks
  { name: 'Weekly Streak-bronze', description: '3-day reading streak', tier: 'bronze', category: 'behavior', iconType: 'flame', threshold: 3 },
  { name: 'Weekly Streak-silver', description: '7-day reading streak', tier: 'silver', category: 'behavior', iconType: 'flame', threshold: 7 },
  { name: 'Weekly Streak-gold', description: '14-day reading streak', tier: 'gold', category: 'behavior', iconType: 'flame', threshold: 14 },
  { name: 'Monthly Dedication-platinum', description: '30-day reading streak', tier: 'platinum', category: 'behavior', iconType: 'flame', threshold: 30 },

  // Behavior badges - bookmarks (Curator)
  { name: 'Curator-bronze', description: 'Bookmark 5 articles', tier: 'bronze', category: 'behavior', iconType: 'bookmark', threshold: 5 },
  { name: 'Curator-silver', description: 'Bookmark 20 articles', tier: 'silver', category: 'behavior', iconType: 'bookmark', threshold: 20 },
  { name: 'Curator-gold', description: 'Bookmark 50 articles', tier: 'gold', category: 'behavior', iconType: 'bookmark', threshold: 50 },
  { name: 'Curator-platinum', description: 'Bookmark 100 articles', tier: 'platinum', category: 'behavior', iconType: 'bookmark', threshold: 100 },

  // Behavior badges - AI Explorer
  { name: 'AI Explorer-bronze', description: 'Ask 5 AI questions', tier: 'bronze', category: 'behavior', iconType: 'cpu', threshold: 5 },
  { name: 'AI Explorer-silver', description: 'Ask 20 AI questions', tier: 'silver', category: 'behavior', iconType: 'cpu', threshold: 20 },
  { name: 'AI Explorer-gold', description: 'Ask 50 AI questions', tier: 'gold', category: 'behavior', iconType: 'cpu', threshold: 50 },
  { name: 'AI Explorer-platinum', description: 'Ask 100 AI questions', tier: 'platinum', category: 'behavior', iconType: 'cpu', threshold: 100 },

  // Behavior badges - Early Bird
  { name: 'Early Bird-bronze', description: 'Read before 6 AM once', tier: 'bronze', category: 'behavior', iconType: 'sunrise', threshold: 1 },
  { name: 'Early Bird-silver', description: 'Read before 6 AM 5 times', tier: 'silver', category: 'behavior', iconType: 'sunrise', threshold: 5 },
  { name: 'Early Bird-gold', description: 'Read before 6 AM 15 times', tier: 'gold', category: 'behavior', iconType: 'sunrise', threshold: 15 },
  { name: 'Early Bird-platinum', description: 'Read before 6 AM 30 times', tier: 'platinum', category: 'behavior', iconType: 'sunrise', threshold: 30 },

  // Behavior badges - Night Owl
  { name: 'Night Owl-bronze', description: 'Read after midnight once', tier: 'bronze', category: 'behavior', iconType: 'moon', threshold: 1 },
  { name: 'Night Owl-silver', description: 'Read after midnight 5 times', tier: 'silver', category: 'behavior', iconType: 'moon', threshold: 5 },
  { name: 'Night Owl-gold', description: 'Read after midnight 15 times', tier: 'gold', category: 'behavior', iconType: 'moon', threshold: 15 },
  { name: 'Night Owl-platinum', description: 'Read after midnight 30 times', tier: 'platinum', category: 'behavior', iconType: 'moon', threshold: 30 },

  // Weekly Champion per D-48
  { name: 'Weekly Champion-bronze', description: '#1 on weekly leaderboard', tier: 'bronze', category: 'behavior', iconType: 'trophy', threshold: 1 },
  { name: 'Weekly Champion-silver', description: '#1 weekly leaderboard 4 times', tier: 'silver', category: 'behavior', iconType: 'trophy', threshold: 4 },
  { name: 'Weekly Champion-gold', description: '#1 weekly leaderboard 12 times', tier: 'gold', category: 'behavior', iconType: 'trophy', threshold: 12 },
  { name: 'Weekly Champion-platinum', description: '#1 weekly leaderboard 52 times', tier: 'platinum', category: 'behavior', iconType: 'trophy', threshold: 52 },

  // Fact Checker
  { name: 'Fact Checker-bronze', description: 'Verify 3 submissions', tier: 'bronze', category: 'behavior', iconType: 'check-circle', threshold: 3 },
  { name: 'Fact Checker-silver', description: 'Verify 10 submissions', tier: 'silver', category: 'behavior', iconType: 'check-circle', threshold: 10 },
  { name: 'Fact Checker-gold', description: 'Verify 25 submissions', tier: 'gold', category: 'behavior', iconType: 'check-circle', threshold: 25 },
  { name: 'Fact Checker-platinum', description: 'Verify 50 submissions', tier: 'platinum', category: 'behavior', iconType: 'check-circle', threshold: 50 },
];

async function seedBadges() {
  console.log('Seeding badges...');

  for (const badge of BADGE_SEEDS) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
  }

  const count = await prisma.badge.count();
  console.log(`Seeded ${count} badges`);
}

seedBadges()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
