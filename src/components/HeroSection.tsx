import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Globe2, AlertTriangle, Radio, Zap } from 'lucide-react';
import type { NewsArticle, ApiResponse } from '../types';

// Fetch latest articles to get active sources
async function fetchLatestArticles(): Promise<ApiResponse<NewsArticle[]>> {
  const response = await fetch('/api/news?limit=100');
  if (!response.ok) throw new Error('Failed to fetch articles');
  return response.json();
}

interface HeroStats {
  totalArticles: number;
  activeRegions: number;
  criticalEvents: number;
  lastUpdate: string;
}

interface HeroSectionProps {
  stats?: HeroStats;
}

export function HeroSection({ stats }: HeroSectionProps) {
  const defaultStats: HeroStats = {
    totalArticles: stats?.totalArticles ?? 0,
    activeRegions: stats?.activeRegions ?? 6,
    criticalEvents: stats?.criticalEvents ?? 0,
    lastUpdate: stats?.lastUpdate ?? new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };

  // Fetch latest articles to determine active sources
  const { data: articlesData } = useQuery({
    queryKey: ['hero-active-sources'],
    queryFn: fetchLatestArticles,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
  });

  // Extract unique sources sorted by most recent article
  const activeSources = articlesData?.data
    ? Array.from(
        new Map(
          articlesData.data
            .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
            .map((article) => [article.source.name, article.source])
        ).values()
      )
    : [];

  const sourceNames = activeSources.map((s) => s.name);

  return (
    <div className="relative overflow-hidden rounded-xl glass-panel">
      {/* Cyber grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#00f0ff] rounded-full filter blur-[80px] opacity-10 animate-pulse" />
        <div className="absolute -bottom-10 -right-10 w-50 h-50 bg-[#bf00ff] rounded-full filter blur-[90px] opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Title & Description */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2 glass rounded-full px-2.5 py-1">
              <div className="live-indicator">
                <span className="live-dot" />
                <span className="text-[10px]">Live</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight">
              <span className="text-[#00f0ff] text-glow-blue">INTEL</span>
              <span className="text-white">LIGENCE</span>
              <span className="block text-base md:text-lg mt-0.5 font-medium text-gray-400">
                Signal Processing Dashboard
              </span>
            </h1>

            <p className="text-xs text-gray-400 max-w-md font-mono hidden md:block">
              Real-time news analysis from multiple perspectives.
            </p>
          </motion.div>

          {/* Right: Stats Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-2"
          >
            <StatBox
              icon={<Radio className="h-3.5 w-3.5" />}
              value={defaultStats.totalArticles}
              label="Signals"
              color="#00f0ff"
            />
            <StatBox
              icon={<Globe2 className="h-3.5 w-3.5" />}
              value={defaultStats.activeRegions}
              label="Regions"
              color="#00ff88"
            />
            <StatBox
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              value={defaultStats.criticalEvents}
              label="Critical"
              color="#ff0044"
              pulse={defaultStats.criticalEvents > 0}
            />
            <StatBox
              icon={<Zap className="h-3.5 w-3.5" />}
              value={defaultStats.lastUpdate}
              label="Sync"
              color="#bf00ff"
              isText
            />
          </motion.div>
        </div>

        {/* Bottom Bar - Scrolling ticker with all active feeds */}
        {sourceNames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-3 pt-2 border-t border-[rgba(0,240,255,0.1)] items-center gap-3 overflow-hidden hidden md:flex"
          >
            <span className="flex-shrink-0 text-[9px] font-mono text-[#00f0ff] uppercase tracking-wider">
              Active Feeds ({sourceNames.length})
            </span>
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-3 animate-marquee">
                {sourceNames.map((source, index) => (
                  <span
                    key={`${source}-${index}`}
                    className="flex-shrink-0 text-[10px] font-mono text-gray-500 hover:text-[#00f0ff] transition-colors"
                  >
                    {source}
                  </span>
                ))}
                {/* Duplicate for seamless loop */}
                {sourceNames.map((source, index) => (
                  <span
                    key={`${source}-dup-${index}`}
                    className="flex-shrink-0 text-[10px] font-mono text-gray-500 hover:text-[#00f0ff] transition-colors"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface StatBoxProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  isText?: boolean;
  pulse?: boolean;
}

function StatBox({ icon, value, label, color, isText, pulse }: StatBoxProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="stat-box relative"
      style={{
        borderColor: `${color}20`,
      }}
    >
      {pulse && (
        <div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
        />
      )}

      <div
        className="mb-0.5"
        style={{ color: `${color}80` }}
      >
        {icon}
      </div>

      <div
        className="stat-value text-base"
        style={{ color, textShadow: `0 0 15px ${color}` }}
      >
        {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      <div className="stat-label text-[8px]">{label}</div>
    </motion.div>
  );
}
