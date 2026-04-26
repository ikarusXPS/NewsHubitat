import type { NewsArticle, PerspectiveRegion } from '../types';

interface ScoredArticle {
  article: NewsArticle;
  score: number;
}

/**
 * Extract keywords from a question for matching against articles.
 * Removes common stop words and normalizes text.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'was', 'ist', 'sind', 'der', 'die', 'das', 'ein', 'eine', 'und', 'oder',
    'in', 'im', 'an', 'auf', 'für', 'mit', 'zu', 'von', 'bei', 'nach',
    'über', 'wie', 'wer', 'wo', 'wann', 'warum', 'welche', 'welcher',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'who', 'where',
    'when', 'why', 'how', 'which', 'that', 'this', 'these', 'those',
    'about', 'from', 'with', 'for', 'and', 'or', 'but', 'not', 'have', 'has',
    'today', 'heute', 'main', 'haupt', 'topics', 'themen',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Calculate keyword match score between question and article.
 * Returns 0-50 points based on keyword matches in title and summary.
 */
function calculateKeywordScore(article: NewsArticle, keywords: string[]): number {
  if (keywords.length === 0) return 25; // Neutral score if no specific keywords

  const titleText = (article.title + ' ' + (article.titleTranslated?.de || '')).toLowerCase();
  const summaryText = (article.summary || article.content.substring(0, 300)).toLowerCase();
  const combinedText = titleText + ' ' + summaryText;

  let matchCount = 0;
  for (const keyword of keywords) {
    if (combinedText.includes(keyword)) {
      matchCount++;
      // Extra points for title matches
      if (titleText.includes(keyword)) {
        matchCount += 0.5;
      }
    }
  }

  // Normalize to 0-50 scale
  const matchRatio = matchCount / keywords.length;
  return Math.min(50, Math.round(matchRatio * 50));
}

/**
 * Calculate recency score based on article publish date.
 * Returns 0-30 points: newer articles score higher.
 */
function calculateRecencyScore(article: NewsArticle): number {
  const now = Date.now();
  const publishedAt = new Date(article.publishedAt).getTime();
  const ageInHours = (now - publishedAt) / (1000 * 60 * 60);

  if (ageInHours <= 6) return 30;      // Very recent
  if (ageInHours <= 12) return 25;     // Recent
  if (ageInHours <= 24) return 20;     // Today
  if (ageInHours <= 48) return 15;     // Yesterday
  if (ageInHours <= 72) return 10;     // 2-3 days
  if (ageInHours <= 168) return 5;     // Within a week
  return 0;                             // Older
}

/**
 * Calculate perspective diversity bonus.
 * Returns +10 if the region is underrepresented in already-selected articles.
 */
function calculateDiversityBonus(
  article: NewsArticle,
  selectedRegions: Map<PerspectiveRegion, number>
): number {
  const regionCount = selectedRegions.get(article.perspective) || 0;
  // Bonus for underrepresented regions (less than 2 articles)
  if (regionCount < 2) return 10;
  if (regionCount < 3) return 5;
  return 0;
}

/**
 * Select the most relevant articles for a given question.
 * Uses a combination of keyword matching, recency, and perspective diversity.
 *
 * @param articles - All available articles
 * @param question - User's question
 * @param limit - Maximum number of articles to return (default: 10)
 * @returns Array of most relevant articles
 */
export function getTopRelevantArticles(
  articles: NewsArticle[],
  question: string,
  limit: number = 10
): NewsArticle[] {
  if (articles.length <= limit) {
    return articles;
  }

  const keywords = extractKeywords(question);

  // Score all articles
  const scoredArticles: ScoredArticle[] = articles.map(article => ({
    article,
    score: calculateKeywordScore(article, keywords) + calculateRecencyScore(article),
  }));

  // Sort by initial score
  scoredArticles.sort((a, b) => b.score - a.score);

  // Select articles with diversity consideration
  const selected: NewsArticle[] = [];
  const selectedRegions = new Map<PerspectiveRegion, number>();

  for (const scored of scoredArticles) {
    if (selected.length >= limit) break;

    // Recalculate with diversity bonus
    const diversityBonus = calculateDiversityBonus(scored.article, selectedRegions);
    const finalScore = scored.score + diversityBonus;

    // Check if this article should be inserted before lower-scored articles
    // (due to diversity bonus potentially making it more valuable)
    if (selected.length > 0) {
      // Find position where this should be inserted
      let insertPos = selected.length;
      for (let i = selected.length - 1; i >= 0; i--) {
        const existingScore = scoredArticles.find(s => s.article.id === selected[i].id)?.score || 0;
        if (finalScore > existingScore) {
          insertPos = i;
        } else {
          break;
        }
      }

      if (insertPos < limit) {
        selected.splice(insertPos, 0, scored.article);
        if (selected.length > limit) {
          // Remove lowest scored article to maintain limit
          const removed = selected.pop();
          if (removed) {
            const region = removed.perspective;
            const count = selectedRegions.get(region) || 1;
            selectedRegions.set(region, count - 1);
          }
        }
      }
    } else {
      selected.push(scored.article);
    }

    // Update region counts
    const region = scored.article.perspective;
    selectedRegions.set(region, (selectedRegions.get(region) || 0) + 1);
  }

  // Ensure we have exactly limit articles (or all if less available)
  while (selected.length < limit && selected.length < articles.length) {
    const remaining = scoredArticles.filter(s => !selected.includes(s.article));
    if (remaining.length === 0) break;
    selected.push(remaining[0].article);
  }

  return selected.slice(0, limit);
}

/**
 * Estimate token count for article context.
 * Rough estimate: ~4 characters per token for mixed content.
 */
export function estimateContextTokens(articles: NewsArticle[]): number {
  let totalChars = 0;
  for (const article of articles) {
    // Title + source + perspective (compact format)
    totalChars += (article.title.length + 30);
    // Summary (truncated to 150 chars)
    const summary = article.summary || article.content.substring(0, 150);
    totalChars += Math.min(summary.length, 150);
  }
  return Math.ceil(totalChars / 4);
}
