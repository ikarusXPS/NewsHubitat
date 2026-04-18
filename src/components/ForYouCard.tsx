import { ExternalLink, Sparkles } from 'lucide-react';
import { formatTopicBadge } from '../lib/personalization';
import type { NewsArticle } from '../types';
import { useAppStore } from '../store';

interface ForYouCardProps {
  article: NewsArticle;
  matchedTopic: string | null;
}

const REGION_COLORS: Record<string, string> = {
  usa: '#00f0ff',
  europa: '#00f0ff',
  deutschland: '#00f0ff',
  nahost: '#ff6600',
  tuerkei: '#ff0044',
  russland: '#bf00ff',
  china: '#ffee00',
  asien: '#ffee00',
  afrika: '#ff6600',
  lateinamerika: '#00ff88',
  ozeanien: '#00f0ff',
  kanada: '#00f0ff',
  alternative: '#00ff88',
};

export function ForYouCard({ article, matchedTopic }: ForYouCardProps) {
  const { language, addToReadingHistory } = useAppStore();

  const handleClick = () => {
    addToReadingHistory(article.id);
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const title =
    language === 'de' && article.titleTranslated?.de
      ? article.titleTranslated.de
      : article.title;

  const regionColor = REGION_COLORS[article.perspective] || '#00f0ff';

  return (
    <button
      onClick={handleClick}
      className="w-full text-left glass-panel rounded-xl p-4 hover:border-[#00f0ff]/50 transition-all group"
    >
      {/* Interest badge per D-12 */}
      {matchedTopic && (
        <div className="flex items-center gap-1 mb-2">
          <Sparkles className="h-3 w-3 text-[#bf00ff]" />
          <span className="text-[10px] font-mono text-[#bf00ff] uppercase tracking-wider">
            {language === 'de' ? 'Basierend auf' : 'Based on'} {formatTopicBadge(matchedTopic)}
          </span>
        </div>
      )}

      {/* Image */}
      {article.imageUrl && (
        <div className="relative aspect-video mb-3 rounded-lg overflow-hidden bg-gray-800">
          <img
            src={article.imageUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      {/* Region indicator */}
      <div
        className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase mb-2"
        style={{
          backgroundColor: `${regionColor}20`,
          color: regionColor,
        }}
      >
        {article.source.name}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-[#00f0ff] transition-colors">
        {title}
      </h3>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] font-mono text-gray-500">
          {new Date(article.publishedAt).toLocaleDateString()}
        </span>
        <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-[#00f0ff] transition-colors" />
      </div>
    </button>
  );
}
