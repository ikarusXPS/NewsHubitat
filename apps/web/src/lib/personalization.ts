import type { NewsArticle, PerspectiveRegion } from '../types';

interface HistoryEntry {
  articleId: string;
  timestamp: number;
  readCount?: number;
}

export interface UserInterests {
  topics: Map<string, number>;        // topic -> weighted count
  regions: Map<PerspectiveRegion, number>;  // region -> weighted count
  recentTopics: Map<string, number>;  // last 7 days topics (higher weight per D-15)
  topTopics: string[];                // Top 3 topics for badge display
}

// Stop words for keyword extraction (bilingual DE/EN)
const STOP_WORDS = new Set([
  'was', 'ist', 'sind', 'der', 'die', 'das', 'ein', 'eine', 'und', 'oder',
  'in', 'im', 'an', 'auf', 'fur', 'mit', 'zu', 'von', 'bei', 'nach',
  'uber', 'wie', 'wer', 'wo', 'wann', 'warum', 'welche', 'welcher',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'who', 'where',
  'when', 'why', 'how', 'which', 'that', 'this', 'these', 'those',
  'about', 'from', 'with', 'for', 'and', 'or', 'but', 'not', 'have', 'has',
  'today', 'heute', 'main', 'haupt', 'topics', 'themen', 'news', 'report',
  'says', 'said', 'new', 'will', 'nach', 'mehr',
]);

/**
 * Extract keywords from article title
 */
export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));
}

/**
 * Extract user interests from reading history per D-09, D-10
 */
export function extractUserInterests(
  history: HistoryEntry[],
  articles: Map<string, NewsArticle>
): UserInterests {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const topics = new Map<string, number>();
  const regions = new Map<PerspectiveRegion, number>();
  const recentTopics = new Map<string, number>();

  history.forEach((entry) => {
    const article = articles.get(entry.articleId);
    if (!article) return;

    const readWeight = entry.readCount || 1;
    const isRecent = entry.timestamp > sevenDaysAgo;

    // Extract keywords from title per D-10
    const keywords = extractKeywords(article.title);
    keywords.forEach((kw) => {
      const weight = isRecent ? readWeight * 2 : readWeight; // Recent bias per D-15
      topics.set(kw, (topics.get(kw) || 0) + weight);
      if (isRecent) {
        recentTopics.set(kw, (recentTopics.get(kw) || 0) + weight);
      }
    });

    // Also extract from article topics if available
    try {
      const articleTopics = (Array.isArray(article.topics) ? article.topics : JSON.parse(article.topics || '[]')) as string[];
      articleTopics.forEach((topic) => {
        const normalizedTopic = topic.toLowerCase().trim();
        if (normalizedTopic.length > 2) {
          const weight = isRecent ? readWeight * 3 : readWeight * 1.5; // Higher weight for explicit topics
          topics.set(normalizedTopic, (topics.get(normalizedTopic) || 0) + weight);
          if (isRecent) {
            recentTopics.set(normalizedTopic, (recentTopics.get(normalizedTopic) || 0) + weight);
          }
        }
      });
    } catch {
      // Ignore parse errors
    }

    // Track regional preferences per D-10
    const region = article.perspective as PerspectiveRegion;
    const regionWeight = isRecent ? readWeight * 2 : readWeight;
    regions.set(region, (regions.get(region) || 0) + regionWeight);
  });

  // Get top 3 topics for badge display per D-12
  const topTopics = Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  return { topics, regions, recentTopics, topTopics };
}

/**
 * Score an article for personalization per D-09, D-10, D-15
 */
export function scoreArticleForUser(
  article: NewsArticle,
  interests: UserInterests
): { score: number; matchedTopic: string | null } {
  let score = 0;
  let matchedTopic: string | null = null;
  let highestTopicScore = 0;

  const articleKeywords = extractKeywords(article.title);

  // Topic matching per D-09
  articleKeywords.forEach((kw) => {
    const baseScore = interests.topics.get(kw) || 0;
    const recentScore = interests.recentTopics.get(kw) || 0;

    // Recent topics weighted 1.5x higher per D-15
    const topicScore = baseScore + recentScore * 1.5;
    score += topicScore;

    if (topicScore > highestTopicScore) {
      highestTopicScore = topicScore;
      matchedTopic = kw;
    }
  });

  // Check article topics for matches
  try {
    const articleTopics = (Array.isArray(article.topics) ? article.topics : JSON.parse(article.topics || '[]')) as string[];
    articleTopics.forEach((topic) => {
      const normalizedTopic = topic.toLowerCase().trim();
      const baseScore = interests.topics.get(normalizedTopic) || 0;
      const recentScore = interests.recentTopics.get(normalizedTopic) || 0;
      const topicScore = (baseScore + recentScore * 1.5) * 2; // Explicit topic match worth more
      score += topicScore;

      if (topicScore > highestTopicScore) {
        highestTopicScore = topicScore;
        matchedTopic = normalizedTopic;
      }
    });
  } catch {
    // Ignore
  }

  // Regional preference bonus per D-10
  const region = article.perspective as PerspectiveRegion;
  const regionScore = interests.regions.get(region) || 0;
  score += regionScore * 0.5; // Lower weight than topic match

  // Recency boost for fresh articles
  const articleAge = Date.now() - new Date(article.publishedAt).getTime();
  const hourAge = articleAge / (1000 * 60 * 60);
  if (hourAge < 6) score *= 1.3;
  else if (hourAge < 24) score *= 1.1;

  return { score, matchedTopic };
}

export interface Recommendation {
  article: NewsArticle;
  score: number;
  matchedTopic: string | null;
}

/**
 * Get personalized recommendations per D-11, D-21
 */
export function getRecommendations(
  articles: NewsArticle[],
  history: HistoryEntry[],
  historyArticles: Map<string, NewsArticle>,
  limit: number = 12
): Recommendation[] {
  // Extract user interests
  const interests = extractUserInterests(history, historyArticles);

  // Get read article IDs for exclusion per D-21
  const readArticleIds = new Set(history.map((e) => e.articleId));

  // Score and filter articles
  const scored: Recommendation[] = articles
    .filter((article) => !readArticleIds.has(article.id)) // Exclude already read per D-21
    .map((article) => {
      const { score, matchedTopic } = scoreArticleForUser(article, interests);
      return { article, score, matchedTopic };
    })
    .filter((r) => r.score > 0) // Only include articles with positive match
    .sort((a, b) => b.score - a.score);

  // Return top recommendations (8-12 per D-11)
  return scored.slice(0, limit);
}

/**
 * Format matched topic for display badge per D-12
 */
export function formatTopicBadge(topic: string): string {
  // Capitalize first letter
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}
