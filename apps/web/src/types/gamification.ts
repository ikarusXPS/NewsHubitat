// Badge tiers per D-41 (4 tiers)
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

// Badge categories per D-42
export type BadgeCategory = 'volume' | 'diversity' | 'behavior';

// Badge rarity colors for UI (from 06-UI-SPEC.md)
export const BADGE_RARITY_COLORS = {
  bronze: { bg: '#cd7f32', border: '#cd7f32', text: '#cd7f32' },
  silver: { bg: '#c0c0c0', border: '#c0c0c0', text: '#c0c0c0' },
  gold: { bg: '#ffee00', border: '#ffee00', text: '#ffee00' },
  platinum: { bg: '#00f0ff', border: '#00f0ff', text: '#00f0ff' },
} as const;

// Badge definition (for BADGE_DEFINITIONS constant)
export interface BadgeDefinition {
  id: string;
  name: string;  // English only per D-46
  description: string;
  tiers: number[];  // Threshold for each tier [bronze, silver, gold, platinum]
  category: BadgeCategory;
  iconType: string;  // Emoji or icon identifier
}

// Badge with user progress
export interface Badge {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  category: BadgeCategory;
  iconType: string;
  threshold: number;
}

// User's earned badge with progress
export interface UserBadge {
  id: string;
  badgeId: string;
  badge: Badge;
  earnedAt: Date;
  progress: number;
}

// Badge progress for display
export interface BadgeProgress {
  badgeId: string;
  name: string;
  description: string;
  iconType: string;
  category: BadgeCategory;
  currentValue: number;
  targetValue: number;
  tier: BadgeTier | null;  // null if not yet earned any tier
  isEarned: boolean;
  progress: number;  // 0-100 percentage
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  selectedPresetAvatar: string | null;
  points: number;
  level: number;
  streak: number;
  badgeCount: number;
}

// Leaderboard snapshot from DB
export interface LeaderboardSnapshot {
  id: string;
  date: Date;
  timeframe: 'all-time' | 'monthly' | 'weekly';
  rankings: LeaderboardEntry[];
}

// Leaderboard time filter
export type LeaderboardTimeFilter = 'all-time' | 'monthly' | 'weekly';

// Avatar preset (historical figures per D-25, D-26)
export interface AvatarPreset {
  id: string;
  name: string;
  era: string;  // e.g., "69-30 BC" for tooltip per D-34
  region: 'western' | 'middle-east' | 'turkish' | 'russian' | 'chinese' | 'alternative';
  imageUrl: string;
}

// Region unlock status for avatar system (D-37)
export interface RegionUnlockStatus {
  region: string;
  articlesRead: number;
  required: number;  // 5 per D-37
  unlocked: boolean;
}

// Achievement unlock event for toast
export interface AchievementUnlock {
  type: 'badge' | 'region-avatars' | 'weekly-champion';
  badgeId?: string;
  badgeName?: string;
  region?: string;
  message: string;
}

// Badge definitions per D-41, D-42, D-45
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'bookworm',
    name: 'Bookworm',
    description: 'Read articles',
    tiers: [10, 50, 100, 500],
    category: 'volume',
    iconType: 'book-open',
  },
  {
    id: 'global-reader',
    name: 'Global Perspective Reader',
    description: 'Read articles from all regions',
    tiers: [3, 4, 5, 6],
    category: 'diversity',
    iconType: 'globe',
  },
  {
    id: 'streak-daily',
    name: 'Streak Master',
    description: 'Maintain daily reading streak',
    tiers: [3, 7, 14, 30],
    category: 'behavior',
    iconType: 'flame',
  },
  {
    id: 'curator',
    name: 'Curator',
    description: 'Bookmark articles',
    tiers: [5, 20, 50, 100],
    category: 'behavior',
    iconType: 'bookmark',
  },
  {
    id: 'ai-explorer',
    name: 'AI Explorer',
    description: 'Ask AI questions',
    tiers: [5, 20, 50, 100],
    category: 'behavior',
    iconType: 'cpu',
  },
  {
    id: 'fact-checker',
    name: 'Fact Checker',
    description: 'Verify community submissions',
    tiers: [3, 10, 25, 50],
    category: 'behavior',
    iconType: 'check-circle',
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Read articles before 6 AM',
    tiers: [1, 5, 15, 30],
    category: 'behavior',
    iconType: 'sunrise',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Read articles after midnight',
    tiers: [1, 5, 15, 30],
    category: 'behavior',
    iconType: 'moon',
  },
  {
    id: 'weekly-champion',
    name: 'Weekly Champion',
    description: '#1 on weekly leaderboard',
    tiers: [1, 4, 12, 52],
    category: 'behavior',
    iconType: 'trophy',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Read 500 articles',
    tiers: [100, 250, 500, 1000],
    category: 'volume',
    iconType: 'graduation-cap',
  },
];

// Avatar presets per region (D-25, D-26) - 5 per region
export const AVATAR_PRESETS: AvatarPreset[] = [
  // Western (5)
  { id: 'lincoln', name: 'Abraham Lincoln', era: '1809-1865', region: 'western', imageUrl: '/avatars/presets/lincoln.png' },
  { id: 'einstein', name: 'Albert Einstein', era: '1879-1955', region: 'western', imageUrl: '/avatars/presets/einstein.png' },
  { id: 'churchill', name: 'Winston Churchill', era: '1874-1965', region: 'western', imageUrl: '/avatars/presets/churchill.png' },
  { id: 'curie', name: 'Marie Curie', era: '1867-1934', region: 'western', imageUrl: '/avatars/presets/curie.png' },
  { id: 'shakespeare', name: 'William Shakespeare', era: '1564-1616', region: 'western', imageUrl: '/avatars/presets/shakespeare.png' },

  // Middle East (5)
  { id: 'saladin', name: 'Saladin', era: '1137-1193', region: 'middle-east', imageUrl: '/avatars/presets/saladin.png' },
  { id: 'avicenna', name: 'Avicenna', era: '980-1037', region: 'middle-east', imageUrl: '/avatars/presets/avicenna.png' },
  { id: 'cleopatra', name: 'Cleopatra', era: '69-30 BC', region: 'middle-east', imageUrl: '/avatars/presets/cleopatra.png' },
  { id: 'rumi', name: 'Rumi', era: '1207-1273', region: 'middle-east', imageUrl: '/avatars/presets/rumi.png' },
  { id: 'nefertiti', name: 'Nefertiti', era: '1370-1330 BC', region: 'middle-east', imageUrl: '/avatars/presets/nefertiti.png' },

  // Turkish (5)
  { id: 'ataturk', name: 'Mustafa Kemal Ataturk', era: '1881-1938', region: 'turkish', imageUrl: '/avatars/presets/ataturk.png' },
  { id: 'suleiman', name: 'Suleiman the Magnificent', era: '1494-1566', region: 'turkish', imageUrl: '/avatars/presets/suleiman.png' },
  { id: 'fatih', name: 'Mehmed the Conqueror', era: '1432-1481', region: 'turkish', imageUrl: '/avatars/presets/fatih.png' },
  { id: 'halide', name: 'Halide Edib Adivar', era: '1884-1964', region: 'turkish', imageUrl: '/avatars/presets/halide.png' },
  { id: 'mimar-sinan', name: 'Mimar Sinan', era: '1489-1588', region: 'turkish', imageUrl: '/avatars/presets/mimar-sinan.png' },

  // Russian (5)
  { id: 'peter-great', name: 'Peter the Great', era: '1672-1725', region: 'russian', imageUrl: '/avatars/presets/peter-great.png' },
  { id: 'tolstoy', name: 'Leo Tolstoy', era: '1828-1910', region: 'russian', imageUrl: '/avatars/presets/tolstoy.png' },
  { id: 'catherine', name: 'Catherine the Great', era: '1729-1796', region: 'russian', imageUrl: '/avatars/presets/catherine.png' },
  { id: 'gagarin', name: 'Yuri Gagarin', era: '1934-1968', region: 'russian', imageUrl: '/avatars/presets/gagarin.png' },
  { id: 'tchaikovsky', name: 'Pyotr Tchaikovsky', era: '1840-1893', region: 'russian', imageUrl: '/avatars/presets/tchaikovsky.png' },

  // Chinese (5)
  { id: 'confucius', name: 'Confucius', era: '551-479 BC', region: 'chinese', imageUrl: '/avatars/presets/confucius.png' },
  { id: 'sun-tzu', name: 'Sun Tzu', era: '544-496 BC', region: 'chinese', imageUrl: '/avatars/presets/sun-tzu.png' },
  { id: 'wu-zetian', name: 'Wu Zetian', era: '624-705', region: 'chinese', imageUrl: '/avatars/presets/wu-zetian.png' },
  { id: 'qin-shi-huang', name: 'Qin Shi Huang', era: '259-210 BC', region: 'chinese', imageUrl: '/avatars/presets/qin-shi-huang.png' },
  { id: 'laozi', name: 'Laozi', era: '6th century BC', region: 'chinese', imageUrl: '/avatars/presets/laozi.png' },

  // Alternative (5)
  { id: 'mandela', name: 'Nelson Mandela', era: '1918-2013', region: 'alternative', imageUrl: '/avatars/presets/mandela.png' },
  { id: 'gandhi', name: 'Mahatma Gandhi', era: '1869-1948', region: 'alternative', imageUrl: '/avatars/presets/gandhi.png' },
  { id: 'bolivar', name: 'Simon Bolivar', era: '1783-1830', region: 'alternative', imageUrl: '/avatars/presets/bolivar.png' },
  { id: 'mlk', name: 'Martin Luther King Jr.', era: '1929-1968', region: 'alternative', imageUrl: '/avatars/presets/mlk.png' },
  { id: 'frida', name: 'Frida Kahlo', era: '1907-1954', region: 'alternative', imageUrl: '/avatars/presets/frida.png' },
];
