import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock } from 'lucide-react';
import type { NewsArticle } from '../types';

interface NewsResponse {
  success: boolean;
  data: NewsArticle[];
}

async function fetchBreakingNews(): Promise<NewsArticle[]> {
  const response = await fetch('/api/news?limit=20');
  if (!response.ok) throw new Error('Failed to fetch breaking news');
  const result: NewsResponse = await response.json();

  // Filter for high-severity news (negative sentiment)
  return result.data
    .filter((article) => article.sentiment === 'negative')
    .slice(0, 10);
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function BreakingNewsTicker() {
  const [isPaused, setIsPaused] = useState(false);

  const { data: articles, error } = useQuery({
    queryKey: ['breaking-news'],
    queryFn: fetchBreakingNews,
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    staleTime: 60 * 1000,
    retry: 1,
  });

  // Don't render if there's an error
  if (error) return null;

  // Scroll animation effect
  useEffect(() => {
    if (!articles || articles.length === 0) return;

    const ticker = document.getElementById('news-ticker-content');
    if (!ticker || isPaused) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame

    const scroll = () => {
      if (!isPaused) {
        scrollPosition += scrollSpeed;
        if (ticker.scrollWidth > 0 && scrollPosition >= ticker.scrollWidth / 2) {
          scrollPosition = 0;
        }
        ticker.style.transform = `translateX(-${scrollPosition}px)`;
      }
      requestAnimationFrame(scroll);
    };

    const animationFrame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrame);
  }, [articles, isPaused]);

  if (!articles || articles.length === 0) return null;

  // Duplicate articles for seamless loop
  const displayArticles = [...articles, ...articles];

  return (
    <div
      className="relative overflow-hidden border-b border-[#ff0044]/20 bg-gradient-to-r from-[#ff0044]/10 via-[#ff0044]/5 to-[#ff0044]/10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center h-10">
        {/* Breaking News Label */}
        <div className="flex-shrink-0 flex items-center gap-2 px-4 bg-[#ff0044] h-full">
          <AlertTriangle className="h-3.5 w-3.5 text-white animate-pulse" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Breaking
          </span>
        </div>

        {/* Scrolling Content */}
        <div className="flex-1 overflow-hidden">
          <div
            id="news-ticker-content"
            className="flex items-center gap-8 whitespace-nowrap will-change-transform"
            style={{ display: 'inline-flex' }}
          >
            {displayArticles.map((article, index) => (
              <motion.a
                key={`${article.id}-${index}`}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-2 hover:text-[#00f0ff] transition-colors cursor-pointer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Country Flag */}
                <span className="text-base flex-shrink-0">
                  {getCountryFlag(article.source.country)}
                </span>

                {/* Separator */}
                <span className="text-[#ff0044]">•</span>

                {/* Headline */}
                <span className="text-xs font-mono text-white">
                  {article.title}
                </span>

                {/* Time */}
                <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(article.publishedAt)}
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient Fade Edges */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0a0e1a] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0a0e1a] to-transparent pointer-events-none" />
    </div>
  );
}
