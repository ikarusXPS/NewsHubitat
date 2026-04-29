import { Sparkles, ChevronRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePersonalization } from '../hooks/usePersonalization';
import { ForYouCard } from './ForYouCard';
import { useAppStore } from '../store';

interface ForYouCarouselProps {
  enabled?: boolean;
}

export function ForYouCarousel({ enabled = true }: ForYouCarouselProps) {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const { recommendations, isLoading, isEligible, readCount, requiredCount } =
    usePersonalization({ enabled });

  // Don't render if not eligible or no recommendations per D-22
  if (!isEligible) {
    // Show threshold message if close to eligible
    if (readCount > 0 && readCount < requiredCount) {
      return (
        <div className="glass-panel rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 text-gray-400">
            <BookOpen className="h-5 w-5 text-[#bf00ff]" />
            <span className="text-sm">
              {language === 'de'
                ? `Lesen Sie ${requiredCount - readCount} weitere Artikel, um personalisierte Empfehlungen freizuschalten`
                : `Read ${requiredCount - readCount} more articles to unlock personalized recommendations`}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-[#bf00ff]" />
          <span className="text-sm font-mono text-gray-500 uppercase tracking-wider">
            For You
          </span>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-none w-[280px]">
              <div className="glass-panel rounded-xl p-4 animate-pulse">
                <div className="aspect-video bg-gray-800 rounded-lg mb-3" />
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-800 rounded w-full mb-1" />
                <div className="h-4 bg-gray-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Hide entirely if no recommendations per D-22
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#bf00ff]" />
          <span className="text-sm font-mono text-gray-500 uppercase tracking-wider">
            {language === 'de' ? 'Fur Dich' : 'For You'}
          </span>
          <span className="text-[10px] font-mono text-gray-600">
            {language === 'de' ? 'Basierend auf deinen Interessen' : 'Based on your interests'}
          </span>
        </div>
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-[#00f0ff] transition-colors"
        >
          {language === 'de' ? 'Alle anzeigen' : 'See All'}
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Carousel with CSS scroll-snap per RESEARCH.md */}
      <div
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {recommendations.map(({ article, matchedTopic }) => (
          <div key={article.id} className="snap-start flex-none w-[280px]">
            <ForYouCard article={article} matchedTopic={matchedTopic} />
          </div>
        ))}
      </div>
    </div>
  );
}
