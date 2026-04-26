import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Plus,
  Search,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { NewsArticle } from '../types';

interface CompareModeProps {
  articles: NewsArticle[];
  isOpen: boolean;
  onClose: () => void;
}

const PERSPECTIVE_COLORS: Record<string, string> = {
  usa: '#3b82f6',
  europa: '#8b5cf6',
  deutschland: '#000000',
  nahost: '#22c55e',
  tuerkei: '#ef4444',
  russland: '#dc2626',
  china: '#eab308',
  asien: '#06b6d4',
  afrika: '#84cc16',
  lateinamerika: '#f59e0b',
  ozeanien: '#14b8a6',
  kanada: '#ef4444',
  alternative: '#06b6d4',
};

const PERSPECTIVE_LABELS: Record<string, string> = {
  usa: 'USA',
  europa: 'Europa',
  deutschland: 'Deutschland',
  nahost: 'Nahost',
  tuerkei: 'Türkei',
  russland: 'Russland',
  china: 'China',
  asien: 'Asien',
  afrika: 'Afrika',
  lateinamerika: 'Lateinamerika',
  ozeanien: 'Ozeanien',
  kanada: 'Kanada',
  alternative: 'Alternative',
};

// Group articles by similar topics
interface TopicGroup {
  topic: string;
  articles: NewsArticle[];
  perspectiveCount: number;
}

function groupArticlesByTopic(articles: NewsArticle[]): TopicGroup[] {
  const topicMap = new Map<string, NewsArticle[]>();

  // Group by primary topic (first topic in array)
  articles.forEach((article) => {
    const primaryTopic = article.topics[0] || 'General';
    const existing = topicMap.get(primaryTopic) || [];
    existing.push(article);
    topicMap.set(primaryTopic, existing);
  });

  // Convert to array and sort by article count
  const groups: TopicGroup[] = [];
  topicMap.forEach((groupArticles, topic) => {
    const uniquePerspectives = new Set(groupArticles.map((a) => a.perspective));
    groups.push({
      topic,
      articles: groupArticles,
      perspectiveCount: uniquePerspectives.size,
    });
  });

  // Sort by perspective count (more perspectives = better for comparison)
  return groups.sort((a, b) => {
    if (b.perspectiveCount !== a.perspectiveCount) {
      return b.perspectiveCount - a.perspectiveCount;
    }
    return b.articles.length - a.articles.length;
  });
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (sentiment === 'positive') {
    return (
      <span className="flex items-center gap-1 text-[#00ff88] text-xs font-mono">
        <TrendingUp className="h-3 w-3" />
        Positiv
      </span>
    );
  }
  if (sentiment === 'negative') {
    return (
      <span className="flex items-center gap-1 text-[#ff0044] text-xs font-mono">
        <TrendingDown className="h-3 w-3" />
        Negativ
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-gray-400 text-xs font-mono">
      <Minus className="h-3 w-3" />
      Neutral
    </span>
  );
}

function ArticleSlot({
  article,
  onRemove,
  onSelect,
  articles,
  side,
  suggestedArticles,
}: {
  article: NewsArticle | null;
  onRemove: () => void;
  onSelect: (article: NewsArticle) => void;
  articles: NewsArticle[];
  side: 'left' | 'right';
  suggestedArticles?: NewsArticle[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showByTopic, setShowByTopic] = useState(true);

  const topicGroups = useMemo(() => groupArticlesByTopic(articles), [articles]);

  const filteredArticles = useMemo(() => {
    if (!search) return articles.slice(0, 20);
    return articles
      .filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.source.name.toLowerCase().includes(search.toLowerCase()) ||
          a.topics.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
      .slice(0, 20);
  }, [articles, search]);

  if (!article) {
    return (
      <div className="relative">
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            'w-full h-64 rounded-xl border-2 border-dashed',
            'flex flex-col items-center justify-center gap-3',
            'border-[#00f0ff]/30 text-[#00f0ff]/50',
            'hover:text-[#00f0ff] hover:border-[#00f0ff]/50',
            'transition-all hover:bg-[#00f0ff]/5'
          )}
        >
          <Plus className="h-8 w-8" />
          <span className="font-mono uppercase tracking-wider text-sm">Artikel auswählen</span>
        </button>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-x-0 top-0 z-10 rounded-xl bg-[#0a0e1a] border border-[#00f0ff]/30 shadow-xl overflow-hidden"
              style={{ boxShadow: '0 0 30px rgba(0,240,255,0.15)' }}
            >
              <div className="p-3 border-b border-[#00f0ff]/20">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00f0ff]/50" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Artikel suchen..."
                    className="w-full rounded-lg bg-[#0a0e1a] border border-[#00f0ff]/20 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none font-mono focus:border-[#00f0ff]/50"
                    autoFocus
                  />
                </div>

                {/* View toggle */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowByTopic(true)}
                    className={cn(
                      'flex-1 py-1.5 px-3 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5',
                      showByTopic
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                    )}
                  >
                    <Layers className="h-3 w-3" />
                    Nach Thema
                  </button>
                  <button
                    onClick={() => setShowByTopic(false)}
                    className={cn(
                      'flex-1 py-1.5 px-3 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5',
                      !showByTopic
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                    )}
                  >
                    <Search className="h-3 w-3" />
                    Alle Artikel
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {/* Suggested similar articles */}
                {suggestedArticles && suggestedArticles.length > 0 && (
                  <div className="p-2 border-b border-[#00f0ff]/10 bg-[#00f0ff]/5">
                    <div className="flex items-center gap-1.5 px-2 mb-2">
                      <Sparkles className="h-3 w-3 text-[#00f0ff]" />
                      <span className="text-[10px] font-mono text-[#00f0ff] uppercase tracking-wider">
                        Empfohlen (gleiches Thema)
                      </span>
                    </div>
                    {suggestedArticles.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          onSelect(a);
                          setSearchOpen(false);
                          setSearch('');
                        }}
                        className="w-full p-2 text-left hover:bg-[#00f0ff]/10 rounded-md transition-colors mb-1"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PERSPECTIVE_COLORS[a.perspective] }}
                          />
                          <p className="text-sm text-white line-clamp-1 font-medium">{a.title}</p>
                        </div>
                        <p className="text-[10px] font-mono text-gray-400 mt-1 pl-4">
                          {a.source.name} • {PERSPECTIVE_LABELS[a.perspective]}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {showByTopic && !search ? (
                  // Show by topic groups
                  <div className="divide-y divide-gray-800">
                    {topicGroups.slice(0, 8).map((group) => (
                      <div key={group.topic} className="p-2">
                        <div className="flex items-center justify-between px-2 mb-2">
                          <span className="text-xs font-mono text-[#00f0ff] uppercase tracking-wider">
                            {group.topic}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {group.perspectiveCount} Perspektiven
                          </span>
                        </div>
                        {group.articles.slice(0, 3).map((a) => (
                          <button
                            key={a.id}
                            onClick={() => {
                              onSelect(a);
                              setSearchOpen(false);
                              setSearch('');
                            }}
                            className="w-full p-2 text-left hover:bg-gray-800/50 rounded-md transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: PERSPECTIVE_COLORS[a.perspective] }}
                              />
                              <p className="text-sm text-white line-clamp-1">{a.title}</p>
                            </div>
                            <p className="text-[10px] font-mono text-gray-500 mt-1 pl-4">
                              {a.source.name} • {PERSPECTIVE_LABELS[a.perspective]}
                            </p>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Show filtered list
                  filteredArticles.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        onSelect(a);
                        setSearchOpen(false);
                        setSearch('');
                      }}
                      className="w-full p-3 text-left hover:bg-gray-800/50 border-b border-gray-800/50 last:border-0 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PERSPECTIVE_COLORS[a.perspective] }}
                        />
                        <p className="text-sm text-white line-clamp-1">{a.title}</p>
                      </div>
                      <p className="text-[10px] font-mono text-gray-500 mt-1 pl-4">
                        {a.source.name} • {PERSPECTIVE_LABELS[a.perspective]}
                      </p>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="w-full p-2 text-sm font-mono text-gray-400 hover:text-white hover:bg-gray-800/50 border-t border-[#00f0ff]/20 uppercase tracking-wider"
              >
                Abbrechen
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl bg-[#0a0e1a]/80 border border-[#00f0ff]/20 overflow-hidden"
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-[#00f0ff]/10 flex items-center justify-between"
        style={{ backgroundColor: `${PERSPECTIVE_COLORS[article.perspective]}15` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: PERSPECTIVE_COLORS[article.perspective],
              boxShadow: `0 0 8px ${PERSPECTIVE_COLORS[article.perspective]}`,
            }}
          />
          <span className="text-sm font-mono font-medium text-white uppercase tracking-wider">
            {PERSPECTIVE_LABELS[article.perspective]}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="p-1 text-gray-500 hover:text-[#ff0044] rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-[10px] font-mono text-[#00f0ff]/70 uppercase tracking-wider mb-2">
          {article.source.name}
        </p>
        <h4 className="text-white font-medium mb-3 line-clamp-2">{article.title}</h4>
        <p className="text-sm text-gray-400 line-clamp-4 mb-4">
          {article.summary || article.content.substring(0, 200)}
        </p>

        <div className="flex items-center justify-between">
          <SentimentBadge sentiment={article.sentiment} />
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-mono text-[#00f0ff] hover:text-[#00f0ff]/80 transition-colors"
          >
            Original <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export function CompareMode({ articles, isOpen, onClose }: CompareModeProps) {
  const [leftArticle, setLeftArticle] = useState<NewsArticle | null>(null);
  const [rightArticle, setRightArticle] = useState<NewsArticle | null>(null);

  // Find similar articles for suggestion
  const suggestedForRight = useMemo(() => {
    if (!leftArticle) return [];
    // Find articles with same topics but different perspective
    return articles.filter(
      (a) =>
        a.id !== leftArticle.id &&
        a.perspective !== leftArticle.perspective &&
        a.topics.some((t) => leftArticle.topics.includes(t))
    );
  }, [leftArticle, articles]);

  const suggestedForLeft = useMemo(() => {
    if (!rightArticle) return [];
    return articles.filter(
      (a) =>
        a.id !== rightArticle.id &&
        a.perspective !== rightArticle.perspective &&
        a.topics.some((t) => rightArticle.topics.includes(t))
    );
  }, [rightArticle, articles]);

  const comparison = useMemo(() => {
    if (!leftArticle || !rightArticle) return null;

    // Find common topics
    const leftTopics = new Set(leftArticle.topics);
    const rightTopics = new Set(rightArticle.topics);
    const commonTopics = leftArticle.topics.filter((t) => rightTopics.has(t));
    const uniqueLeft = leftArticle.topics.filter((t) => !rightTopics.has(t));
    const uniqueRight = rightArticle.topics.filter((t) => !leftTopics.has(t));

    // Find common entities
    const commonEntities = leftArticle.entities.filter((e) =>
      rightArticle.entities.includes(e)
    );

    return {
      commonTopics,
      uniqueLeft,
      uniqueRight,
      commonEntities,
      sentimentDiff: leftArticle.sentimentScore - rightArticle.sentimentScore,
    };
  }, [leftArticle, rightArticle]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0a0e1a] border border-[#00f0ff]/30 shadow-2xl"
        style={{ boxShadow: '0 0 50px rgba(0,240,255,0.1)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#00f0ff]/20 bg-[#0a0e1a]/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5 text-[#00f0ff]" />
            </div>
            <div>
              <h2 className="text-lg font-mono font-semibold text-white uppercase tracking-wider">
                Artikel vergleichen
              </h2>
              <p className="text-[10px] font-mono text-gray-500">
                Wählen Sie Artikel aus verschiedenen Perspektiven zum gleichen Thema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-[#ff0044] rounded-lg hover:bg-gray-800/50 transition-colors"
            data-testid="compare-mode-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Articles side by side */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <ArticleSlot
              article={leftArticle}
              onRemove={() => setLeftArticle(null)}
              onSelect={setLeftArticle}
              articles={articles.filter((a) => a.id !== rightArticle?.id)}
              side="left"
              suggestedArticles={suggestedForLeft}
            />
            <ArticleSlot
              article={rightArticle}
              onRemove={() => setRightArticle(null)}
              onSelect={setRightArticle}
              articles={articles.filter((a) => a.id !== leftArticle?.id)}
              side="right"
              suggestedArticles={suggestedForRight}
            />
          </div>

          {/* Comparison results */}
          {comparison && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Sentiment comparison */}
              <div className="glass-panel rounded-xl p-4 border border-[#00f0ff]/20">
                <h4 className="text-sm font-mono font-medium text-white mb-4 uppercase tracking-wider">
                  Sentiment-Vergleich
                </h4>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <div
                      className={cn(
                        'text-3xl font-mono font-bold',
                        leftArticle!.sentiment === 'positive'
                          ? 'text-[#00ff88]'
                          : leftArticle!.sentiment === 'negative'
                          ? 'text-[#ff0044]'
                          : 'text-gray-400'
                      )}
                      style={{
                        textShadow: leftArticle!.sentiment === 'positive'
                          ? '0 0 20px #00ff88'
                          : leftArticle!.sentiment === 'negative'
                          ? '0 0 20px #ff0044'
                          : 'none',
                      }}
                    >
                      {(leftArticle!.sentimentScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mt-1">
                      {PERSPECTIVE_LABELS[leftArticle!.perspective]}
                    </div>
                  </div>

                  <div className="px-4">
                    <div className="h-12 w-px bg-gradient-to-b from-transparent via-[#00f0ff]/30 to-transparent" />
                  </div>

                  <div className="text-center">
                    <div
                      className={cn(
                        'text-3xl font-mono font-bold',
                        rightArticle!.sentiment === 'positive'
                          ? 'text-[#00ff88]'
                          : rightArticle!.sentiment === 'negative'
                          ? 'text-[#ff0044]'
                          : 'text-gray-400'
                      )}
                      style={{
                        textShadow: rightArticle!.sentiment === 'positive'
                          ? '0 0 20px #00ff88'
                          : rightArticle!.sentiment === 'negative'
                          ? '0 0 20px #ff0044'
                          : 'none',
                      }}
                    >
                      {(rightArticle!.sentimentScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mt-1">
                      {PERSPECTIVE_LABELS[rightArticle!.perspective]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Topics comparison */}
              <div className="glass-panel rounded-xl p-4 border border-[#00f0ff]/20">
                <h4 className="text-sm font-mono font-medium text-white mb-4 uppercase tracking-wider">
                  Themen-Überschneidung
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-wider">
                      Nur {PERSPECTIVE_LABELS[leftArticle!.perspective]}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {comparison.uniqueLeft.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full px-2 py-0.5 text-[10px] font-mono border"
                          style={{
                            backgroundColor: `${PERSPECTIVE_COLORS[leftArticle!.perspective]}20`,
                            borderColor: `${PERSPECTIVE_COLORS[leftArticle!.perspective]}40`,
                            color: PERSPECTIVE_COLORS[leftArticle!.perspective],
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                      {comparison.uniqueLeft.length === 0 && (
                        <span className="text-[10px] font-mono text-gray-600">Keine</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-mono text-[#00ff88] mb-2 uppercase tracking-wider">
                      Gemeinsam
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {comparison.commonTopics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full px-2 py-0.5 text-[10px] font-mono bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
                        >
                          {topic}
                        </span>
                      ))}
                      {comparison.commonTopics.length === 0 && (
                        <span className="text-[10px] font-mono text-gray-600">Keine</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-wider">
                      Nur {PERSPECTIVE_LABELS[rightArticle!.perspective]}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {comparison.uniqueRight.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full px-2 py-0.5 text-[10px] font-mono border"
                          style={{
                            backgroundColor: `${PERSPECTIVE_COLORS[rightArticle!.perspective]}20`,
                            borderColor: `${PERSPECTIVE_COLORS[rightArticle!.perspective]}40`,
                            color: PERSPECTIVE_COLORS[rightArticle!.perspective],
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                      {comparison.uniqueRight.length === 0 && (
                        <span className="text-[10px] font-mono text-gray-600">Keine</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Common entities */}
              {comparison.commonEntities.length > 0 && (
                <div className="glass-panel rounded-xl p-4 border border-[#00f0ff]/20">
                  <h4 className="text-sm font-mono font-medium text-white mb-3 uppercase tracking-wider">
                    Gemeinsame Entitäten
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {comparison.commonEntities.map((entity) => (
                      <span
                        key={entity}
                        className="rounded-md px-2 py-1 text-xs font-mono bg-[#bf00ff]/20 text-[#bf00ff] border border-[#bf00ff]/40"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
