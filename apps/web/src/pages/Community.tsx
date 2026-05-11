import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  Trophy,
  Star,
  Award,
  FileText,
  Languages,
  AlertCircle,
  CheckCircle,
  Flame,
  Target,
  Zap,
  Crown,
  Medal,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SubmitNewsForm, type NewsSubmission } from '../components/community/SubmitNewsForm';
import { FactCheckForm, type FactCheckSubmission } from '../components/community/FactCheckForm';
import { TranslateForm, type TranslationSubmission } from '../components/community/TranslateForm';
import { VerifyQueue } from '../components/community/VerifyQueue';
import { StreakCalendar } from '../components/community/StreakCalendar';
import { logger } from '../lib/logger';

// Types
interface ContributionType {
  id: string;
  label: string;
  icon: React.ReactNode;
  points: number;
  color: string;
  description: string;
}

interface Badge {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned: boolean;
  progress?: number;
  requirement?: number;
}

interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  points: number;
  level: number;
  contributions: number;
  streak: number;
}

const CONTRIBUTION_TYPES: ContributionType[] = [
  {
    id: 'news',
    label: 'Submit News',
    icon: <FileText className="h-5 w-5" />,
    points: 50,
    color: '#00f0ff',
    description: 'Submit a new news article or source',
  },
  {
    id: 'correction',
    label: 'Fact Check',
    icon: <AlertCircle className="h-5 w-5" />,
    points: 30,
    color: '#ff6600',
    description: 'Report errors or submit corrections',
  },
  {
    id: 'translation',
    label: 'Translate',
    icon: <Languages className="h-5 w-5" />,
    points: 40,
    color: '#bf00ff',
    description: 'Improve or add translations',
  },
  {
    id: 'verify',
    label: 'Verify',
    icon: <CheckCircle className="h-5 w-5" />,
    points: 20,
    color: '#00ff88',
    description: 'Verify others\' contributions',
  },
];

const BADGES: Badge[] = [
  {
    id: 'first-contribution',
    name: 'First Steps',
    icon: <Star className="h-6 w-6" />,
    description: 'Make your first contribution',
    rarity: 'common',
    earned: true,
  },
  {
    id: 'fact-checker',
    name: 'Fact Checker',
    icon: <Target className="h-6 w-6" />,
    description: 'Verify 10 articles',
    rarity: 'common',
    earned: true,
  },
  {
    id: 'translator',
    name: 'Polyglot',
    icon: <Languages className="h-6 w-6" />,
    description: 'Translate 5 articles',
    rarity: 'rare',
    earned: false,
    progress: 3,
    requirement: 5,
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    icon: <Flame className="h-6 w-6" />,
    description: '7-day contribution streak',
    rarity: 'rare',
    earned: false,
    progress: 4,
    requirement: 7,
  },
  {
    id: 'top-contributor',
    name: 'Elite Contributor',
    icon: <Crown className="h-6 w-6" />,
    description: 'Reach top 10 on leaderboard',
    rarity: 'epic',
    earned: false,
  },
  {
    id: 'master',
    name: 'News Master',
    icon: <Award className="h-6 w-6" />,
    description: 'Reach 10,000 contribution points',
    rarity: 'legendary',
    earned: false,
    progress: 2450,
    requirement: 10000,
  },
];

const LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'SarahK', avatar: '👩‍💻', points: 12450, level: 42, contributions: 156, streak: 23 },
  { rank: 2, name: 'MikeNews', avatar: '📰', points: 11200, level: 38, contributions: 142, streak: 15 },
  { rank: 3, name: 'FactHunter', avatar: '🔍', points: 9870, level: 35, contributions: 128, streak: 31 },
  { rank: 4, name: 'GlobalEyes', avatar: '🌍', points: 8540, level: 32, contributions: 98, streak: 12 },
  { rank: 5, name: 'TruthSeeker', avatar: '⚡', points: 7230, level: 28, contributions: 87, streak: 8 },
  { rank: 6, name: 'NewsNinja', avatar: '🥷', points: 6890, level: 26, contributions: 76, streak: 5 },
  { rank: 7, name: 'Reporter42', avatar: '📝', points: 5670, level: 24, contributions: 65, streak: 9 },
  { rank: 8, name: 'InfoBot', avatar: '🤖', points: 4320, level: 20, contributions: 54, streak: 3 },
];

const RARITY_COLORS = {
  common: { bg: '#4a5568', border: '#718096', text: '#a0aec0' },
  rare: { bg: '#00f0ff', border: '#00f0ff', text: '#00f0ff' },
  epic: { bg: '#bf00ff', border: '#bf00ff', text: '#bf00ff' },
  legendary: { bg: '#ffee00', border: '#ffee00', text: '#ffee00' },
};

// Mock contribution history data for streak calendar
const MOCK_CONTRIBUTION_DATA: Record<string, number> = (() => {
  const data: Record<string, number> = {};
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Random contribution pattern (weighted towards recent days)
    const recentBoost = i < 30 ? 0.3 : 0;
    if (Math.random() < 0.3 + recentBoost) {
      data[dateStr] = Math.floor(Math.random() * 5) + 1;
    }
  }

  return data;
})();

type LeaderboardTimeFilter = 'all' | 'week' | 'month';

export function Community() {
  const [activeTab, setActiveTab] = useState<'contribute' | 'badges' | 'leaderboard'>('contribute');
  const [selectedContribution, setSelectedContribution] = useState<ContributionType | null>(null);
  const [leaderboardFilter, setLeaderboardFilter] = useState<LeaderboardTimeFilter>('all');

  // User stats (mock)
  const userStats = {
    points: 2450,
    level: 15,
    rank: 127,
    contributions: 34,
    streak: 4,
    longestStreak: 12,
    nextLevelPoints: 3000,
  };

  const levelProgress = (userStats.points / userStats.nextLevelPoints) * 100;

  // Calculate elite badge progress (distance to top 10)
  const eliteProgress = useMemo(() => {
    const top10Threshold = LEADERBOARD[9]?.points || 4000;
    const pointsNeeded = Math.max(0, top10Threshold - userStats.points + 1);
    const progressPercent = Math.min(100, (userStats.points / top10Threshold) * 100);
    return { pointsNeeded, progressPercent, threshold: top10Threshold };
  }, [userStats.points]);

  // Filter leaderboard by time
  const filteredLeaderboard = useMemo(() => {
    // In a real app, this would filter by actual time range
    // For mock data, we'll just show the same data with slight modifications
    return LEADERBOARD.map(user => ({
      ...user,
      points: leaderboardFilter === 'week'
        ? Math.floor(user.points * 0.1)
        : leaderboardFilter === 'month'
          ? Math.floor(user.points * 0.4)
          : user.points,
    }));
  }, [leaderboardFilter]);

  // Form submission handlers
  const handleNewsSubmit = (data: NewsSubmission) => {
    logger.log('News submission:', data);
    toast.success('News article submitted! +50 XP', {
      description: 'Your submission will be reviewed by the community.',
    });
    setSelectedContribution(null);
  };

  const handleFactCheckSubmit = (data: FactCheckSubmission) => {
    logger.log('Fact check submission:', data);
    toast.success('Fact check submitted! +30 XP', {
      description: 'Thank you for helping verify information.',
    });
    setSelectedContribution(null);
  };

  const handleTranslationSubmit = (data: TranslationSubmission) => {
    logger.log('Translation submission:', data);
    toast.success('Translation submitted! +40 XP', {
      description: 'Your translation will be reviewed shortly.',
    });
    setSelectedContribution(null);
  };

  const handleVerify = (itemId: string, verdict: 'approve' | 'reject' | 'flag') => {
    logger.log('Verification:', itemId, verdict);
    const messages = {
      approve: 'Contribution approved! +20 XP',
      reject: 'Contribution rejected.',
      flag: 'Flagged for further review.',
    };
    toast.success(messages[verdict]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono flex items-center gap-3">
            <Users className="h-6 w-6 text-[#00f0ff]" />
            <span className="gradient-text-cyber">COMMUNITY</span>
          </h1>
          <p className="text-sm text-gray-500 font-mono mt-1">
            Contribute, earn rewards, climb the leaderboard
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="glass-panel rounded-lg px-4 py-2 flex items-center gap-3">
            <Flame className="h-5 w-5 text-[#ff6600]" />
            <div>
              <div className="text-xs font-mono text-gray-500">Streak</div>
              <div className="text-lg font-bold text-[#ff6600]">{userStats.streak} days</div>
            </div>
          </div>
          <div className="glass-panel rounded-lg px-4 py-2 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-[#ffee00]" />
            <div>
              <div className="text-xs font-mono text-gray-500">Rank</div>
              <div className="text-lg font-bold text-[#ffee00]">#{userStats.rank}</div>
            </div>
          </div>
        </div>
      </div>

      {/* User Progress Card */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Level & Points */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{userStats.level}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00ff88] flex items-center justify-center">
                <Zap className="h-3 w-3 text-black" />
              </div>
            </div>
            <div>
              <div className="text-sm font-mono text-gray-500">Level {userStats.level}</div>
              <div className="text-2xl font-bold text-white">{userStats.points.toLocaleString()} XP</div>
              <div className="text-xs text-gray-500">
                {userStats.nextLevelPoints - userStats.points} XP to next level
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-xs font-mono text-gray-500 mb-2">
              <span>Level {userStats.level}</span>
              <span>Level {userStats.level + 1}</span>
            </div>
            <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] to-[#bf00ff]"
                style={{
                  boxShadow: '0 0 10px rgba(0,240,255,0.5)',
                }}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{userStats.contributions}</div>
              <div className="text-xs font-mono text-gray-500">Contributions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{BADGES.filter(b => b.earned).length}</div>
              <div className="text-xs font-mono text-gray-500">Badges</div>
            </div>
          </div>
        </div>

        {/* Elite Badge Progress */}
        <div className="mt-6 pt-6 border-t border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-[#ffee00]" />
              <span className="text-sm font-mono text-gray-400">Elite Contributor Progress</span>
            </div>
            <span className="text-xs font-mono text-gray-500">
              Rank #{userStats.rank} → Top 10
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${eliteProgress.progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#ffee00] to-[#ff6600]"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-gray-500">{userStats.points.toLocaleString()} XP</span>
            <span className="text-[#ffee00]">
              {eliteProgress.pointsNeeded > 0
                ? `${eliteProgress.pointsNeeded.toLocaleString()} XP to Top 10`
                : 'You\'re in the Top 10!'}
            </span>
            <span className="text-gray-500">{eliteProgress.threshold.toLocaleString()} XP</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'contribute', label: 'Contribute', icon: <FileText className="h-4 w-4" /> },
          { id: 'badges', label: 'Badges', icon: <Award className="h-4 w-4" /> },
          { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="h-4 w-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all',
              activeTab === tab.id
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                : 'text-gray-500 hover:text-white border border-transparent hover:border-gray-700'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'contribute' && (
          <motion.div
            key="contribute"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Contribution Types */}
            <div className="space-y-4">
              <h3 className="signal-label">Choose Contribution Type</h3>
              <div className="grid gap-3">
                {CONTRIBUTION_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedContribution(type)}
                    className={cn(
                      'glass-panel rounded-xl p-4 text-left transition-all group',
                      selectedContribution?.id === type.id
                        ? 'border-[#00f0ff]/50 bg-[rgba(0,240,255,0.05)]'
                        : 'hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: `${type.color}20`,
                            color: type.color,
                          }}
                        >
                          {type.icon}
                        </div>
                        <div>
                          <div className="font-medium text-white">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-bold"
                          style={{ color: type.color }}
                        >
                          +{type.points} XP
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contribution Form - Type-specific */}
            <div className="glass-panel rounded-xl p-6">
              {selectedContribution?.id === 'news' && (
                <SubmitNewsForm
                  onSubmit={handleNewsSubmit}
                  onCancel={() => setSelectedContribution(null)}
                />
              )}
              {selectedContribution?.id === 'correction' && (
                <FactCheckForm
                  onSubmit={handleFactCheckSubmit}
                  onCancel={() => setSelectedContribution(null)}
                />
              )}
              {selectedContribution?.id === 'translation' && (
                <TranslateForm
                  onSubmit={handleTranslationSubmit}
                  onCancel={() => setSelectedContribution(null)}
                />
              )}
              {selectedContribution?.id === 'verify' && (
                <VerifyQueue onVerify={handleVerify} />
              )}
              {!selectedContribution && (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <FileText className="h-12 w-12 text-gray-600 mb-4" />
                  <p className="text-gray-400">Select a contribution type to get started</p>
                  <p className="text-xs text-gray-600 mt-2">Earn XP and badges for your contributions</p>
                </div>
              )}
            </div>

            {/* Streak Calendar - Full width below forms */}
            <div className="md:col-span-2">
              <StreakCalendar
                contributionData={MOCK_CONTRIBUTION_DATA}
                currentStreak={userStats.streak}
                longestStreak={userStats.longestStreak}
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'badges' && (
          <motion.div
            key="badges"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-4"
          >
            {BADGES.map((badge) => {
              const rarityColor = RARITY_COLORS[badge.rarity];
              return (
                <div
                  key={badge.id}
                  className={cn(
                    'glass-panel rounded-xl p-4 transition-all',
                    badge.earned ? 'border-gray-600' : 'opacity-60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-3 rounded-xl',
                        badge.earned ? 'bg-gradient-to-br' : 'bg-gray-800'
                      )}
                      style={{
                        backgroundColor: badge.earned ? `${rarityColor.bg}20` : undefined,
                        borderColor: badge.earned ? rarityColor.border : undefined,
                        color: badge.earned ? rarityColor.text : '#4a5568',
                      }}
                    >
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white">{badge.name}</h4>
                        <span
                          className="text-[10px] font-mono uppercase px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${rarityColor.bg}20`,
                            color: rarityColor.text,
                          }}
                        >
                          {badge.rarity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{badge.description}</p>

                      {badge.progress !== undefined && badge.requirement && !badge.earned && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{badge.progress}/{badge.requirement}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(badge.progress / badge.requirement) * 100}%`,
                                backgroundColor: rarityColor.bg,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {badge.earned && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-[#00ff88]">
                          <CheckCircle className="h-3 w-3" />
                          Earned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Time Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#00f0ff]" />
                <span className="text-sm font-mono text-gray-400">Top Contributors</span>
              </div>
              <div className="flex gap-1 p-1 rounded-lg bg-gray-800/50">
                {([
                  { id: 'all', label: 'All Time' },
                  { id: 'month', label: 'This Month' },
                  { id: 'week', label: 'This Week' },
                ] as const).map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setLeaderboardFilter(filter.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-mono transition-all',
                      leaderboardFilter === filter.id
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                        : 'text-gray-500 hover:text-white'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Top 3 Podium */}
            <div className="flex items-end justify-center gap-3 mb-8 px-4">
              {[filteredLeaderboard[1], filteredLeaderboard[0], filteredLeaderboard[2]].map((user, index) => {
                const podiumOrder = [2, 1, 3];
                const rank = podiumOrder[index];
                const colors = {
                  1: { bg: '#ffee00', glow: 'rgba(255,238,0,0.4)', text: '#ffee00' },
                  2: { bg: '#c0c0c0', glow: 'rgba(192,192,192,0.3)', text: '#c0c0c0' },
                  3: { bg: '#cd7f32', glow: 'rgba(205,127,50,0.3)', text: '#cd7f32' },
                };
                const color = colors[rank as keyof typeof colors];
                // Much more dramatic height difference for visual impact
                const podiumHeight = rank === 1 ? 140 : rank === 2 ? 100 : 70;

                return (
                  <div
                    key={user.rank}
                    className="flex flex-col items-center"
                    style={{ order: rank === 1 ? 2 : rank === 2 ? 1 : 3 }}
                  >
                    {/* User Card */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: (rank - 1) * 0.15, duration: 0.4 }}
                      className="glass-panel rounded-xl p-4 mb-3 text-center relative"
                      style={{
                        borderColor: `${color.bg}40`,
                        boxShadow: `0 0 20px ${color.glow}`,
                        minWidth: rank === 1 ? '140px' : '120px',
                      }}
                    >
                      {/* Rank Badge */}
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: color.bg,
                          color: '#000',
                          boxShadow: `0 0 10px ${color.glow}`,
                        }}
                      >
                        {rank}
                      </div>

                      {/* Avatar */}
                      <div className={cn(
                        "mx-auto mb-2",
                        rank === 1 ? "text-5xl" : "text-4xl"
                      )}>
                        {user.avatar}
                      </div>

                      {/* Name */}
                      <div className={cn(
                        "font-bold text-white truncate",
                        rank === 1 ? "text-base" : "text-sm"
                      )}>
                        {user.name}
                      </div>

                      {/* XP - Prominent display */}
                      <div
                        className={cn(
                          "font-mono font-bold mt-1",
                          rank === 1 ? "text-lg" : "text-base"
                        )}
                        style={{ color: color.text }}
                      >
                        {user.points.toLocaleString()}
                        <span className="text-xs ml-1 opacity-70">XP</span>
                      </div>

                      {/* Level Badge */}
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <span className="text-[10px] font-mono text-gray-500">Lv.</span>
                        <span className="text-xs font-bold text-[#00f0ff]">{user.level}</span>
                      </div>
                    </motion.div>

                    {/* Podium Base */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: podiumHeight }}
                      transition={{ delay: 0.3 + (rank - 1) * 0.1, duration: 0.5, ease: "easeOut" }}
                      className="w-24 rounded-t-lg flex flex-col items-center justify-start pt-3"
                      style={{
                        background: `linear-gradient(to top, ${color.bg}50, ${color.bg}20)`,
                        borderTop: `3px solid ${color.bg}`,
                        borderLeft: `1px solid ${color.bg}40`,
                        borderRight: `1px solid ${color.bg}40`,
                        boxShadow: `0 -5px 20px ${color.glow}`,
                      }}
                    >
                      {rank === 1 && <Crown className="h-8 w-8" style={{ color: color.text }} />}
                      {rank === 2 && <Medal className="h-7 w-7" style={{ color: color.text }} />}
                      {rank === 3 && <Award className="h-6 w-6" style={{ color: color.text }} />}
                      <span
                        className="text-lg font-bold font-mono mt-1"
                        style={{ color: color.text }}
                      >
                        #{rank}
                      </span>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Full Leaderboard */}
            <div className="glass-panel rounded-xl overflow-hidden">
              <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-700 text-xs font-mono text-gray-500 uppercase tracking-wider">
                <span>Rank</span>
                <span className="col-span-2">User</span>
                <span className="text-center">Level</span>
                <span className="text-center">Streak</span>
                <span className="text-right">Points</span>
              </div>
              {filteredLeaderboard.map((user) => (
                <div
                  key={user.rank}
                  className={cn(
                    'grid grid-cols-6 gap-4 p-4 items-center border-b border-gray-800 hover:bg-[rgba(0,240,255,0.02)] transition-colors',
                    user.rank <= 3 && 'bg-[rgba(255,238,0,0.02)]'
                  )}
                >
                  <span className={cn(
                    'text-lg font-bold',
                    user.rank === 1 && 'text-[#ffee00]',
                    user.rank === 2 && 'text-[#c0c0c0]',
                    user.rank === 3 && 'text-[#cd7f32]',
                    user.rank > 3 && 'text-gray-500'
                  )}>
                    #{user.rank}
                  </span>
                  <div className="col-span-2 flex items-center gap-3">
                    <span className="text-2xl">{user.avatar}</span>
                    <div>
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.contributions} contributions</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="px-2 py-1 rounded bg-[#00f0ff]/10 text-[#00f0ff] text-sm font-bold">
                      {user.level}
                    </span>
                  </div>
                  <div className="text-center flex items-center justify-center gap-1">
                    <Flame className="h-4 w-4 text-[#ff6600]" />
                    <span className="text-sm text-[#ff6600]">{user.streak}</span>
                  </div>
                  <div className="text-right font-bold text-white">
                    {user.points.toLocaleString()}
                  </div>
                </div>
              ))}

              {/* User's Own Position (Pinned) */}
              <div className="border-t-2 border-[#00f0ff]/30 bg-[rgba(0,240,255,0.05)]">
                <div className="grid grid-cols-6 gap-4 p-4 items-center">
                  <span className="text-lg font-bold text-[#00f0ff]">
                    #{userStats.rank}
                  </span>
                  <div className="col-span-2 flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    <div>
                      <div className="font-medium text-[#00f0ff] flex items-center gap-2">
                        You
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] font-mono">
                          YOUR RANK
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{userStats.contributions} contributions</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="px-2 py-1 rounded bg-[#00f0ff]/20 text-[#00f0ff] text-sm font-bold">
                      {userStats.level}
                    </span>
                  </div>
                  <div className="text-center flex items-center justify-center gap-1">
                    <Flame className="h-4 w-4 text-[#ff6600]" />
                    <span className="text-sm text-[#ff6600]">{userStats.streak}</span>
                  </div>
                  <div className="text-right font-bold text-[#00f0ff]">
                    {(leaderboardFilter === 'week'
                      ? Math.floor(userStats.points * 0.1)
                      : leaderboardFilter === 'month'
                        ? Math.floor(userStats.points * 0.4)
                        : userStats.points
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
