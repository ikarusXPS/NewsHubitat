import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Globe, Languages, Loader2, Shield, Search, AlertTriangle, X, CheckCircle, Info, Share2, MessageSquare } from 'lucide-react';
import { ShareButtons } from './sharing';
import { BookmarkButton } from './BookmarkButton';
import { useCreateShare, type ShareUrls } from '../hooks/useShare';
import { ResponsiveImage } from './ResponsiveImage';
import { SwipeableCard } from './mobile/SwipeableCard';
import { CredibilityPill } from './credibility/CredibilityPill';
import { BiasBadge } from './credibility/BiasBadge';
import { useCredibility } from '../hooks/useCredibility';
import { cn, getRegionColor, getSentimentColor, truncate } from '../lib/utils';
import { formatDateTime } from '../lib/formatters';
import { useAppStore } from '../store';
import { useIsMobile } from '../hooks/useMediaQuery';
import type { NewsArticle } from '../types';

interface PropagandaIndicator {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  examples: string[];
}

interface PropagandaAnalysis {
  score: number;
  indicators: PropagandaIndicator[];
  summary: string;
  recommendations: string[];
}

interface NewsCardProps {
  article: NewsArticle;
  priority?: boolean; // For first 3 cards - uses eager loading (D-77)
  onTranslate?: (articleId: string, targetLang: 'de' | 'en') => Promise<NewsArticle | null>;
}

export function NewsCard({ article, priority = false, onTranslate }: NewsCardProps) {
  const { language, toggleBookmark, isBookmarked, addToReadingHistory } = useAppStore();
  const bookmarked = isBookmarked(article.id);
  const isMobile = useIsMobile();

  // Track reading when article is clicked
  const trackReading = () => addToReadingHistory(article.id);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [localArticle, setLocalArticle] = useState(article);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [propagandaAnalysis, setPropagandaAnalysis] = useState<PropagandaAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [shareUrls, setShareUrls] = useState<ShareUrls | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const createShare = useCreateShare();

  // Phase 38 D-04 / D-05: per-source credibility + bias surfaces (24h cached
  // by both server Redis and client TanStack Query, so 130 sources × 3 locales
  // is well within the AI inference budget).
  const { data: credibility } = useCredibility(article.source.id);

  const handleAnalyze = async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/ai/propaganda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: localArticle.title,
          content: localArticle.content,
          source: localArticle.source.name,
          perspective: localArticle.perspective,
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze article');

      const data = await response.json();
      setPropagandaAnalysis(data);
      setShowAnalysis(true);
    } catch {
      setAnalysisError('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (shareUrls || isCreatingShare) return;
    setIsCreatingShare(true);
    try {
      const urls = await createShare.mutateAsync(localArticle);
      setShareUrls(urls);
      setShareCode(urls.direct.split('/s/')[1]);
    } catch (err) {
      console.error('Failed to create share:', err);
    } finally {
      setIsCreatingShare(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 30) return '#00ff88';
    if (score <= 60) return '#ffee00';
    return '#ff0044';
  };

  const getScoreLabel = (score: number) => {
    if (score <= 30) return 'Low Risk';
    if (score <= 60) return 'Medium Risk';
    return 'High Risk';
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    if (severity === 'low') return '#00ff88';
    if (severity === 'medium') return '#ffee00';
    return '#ff0044';
  };

  const needsTranslation = localArticle.originalLanguage !== language;
  const hasTranslation = language === 'de'
    ? !!localArticle.titleTranslated?.de
    : !!localArticle.titleTranslated?.en;

  // Handle bookmark action for swipe gesture
  const handleBookmark = () => {
    toggleBookmark(localArticle.id);
  };

  const getDisplayTitle = () => {
    if (showOriginal || !hasTranslation) {
      return localArticle.title;
    }
    return language === 'de'
      ? localArticle.titleTranslated?.de || localArticle.title
      : localArticle.titleTranslated?.en || localArticle.title;
  };

  const getDisplayContent = () => {
    if (showOriginal) {
      return localArticle.summary || truncate(localArticle.content, 200);
    }
    if (language === 'de' && localArticle.contentTranslated?.de) {
      return truncate(localArticle.contentTranslated.de, 200);
    }
    if (language === 'en' && localArticle.contentTranslated?.en) {
      return truncate(localArticle.contentTranslated.en, 200);
    }
    return localArticle.summary || truncate(localArticle.content, 200);
  };

  const handleTranslate = async () => {
    if (!onTranslate || isTranslating) return;

    setIsTranslating(true);
    try {
      const translated = await onTranslate(localArticle.id, language);
      if (translated) {
        setLocalArticle(translated);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const languageLabel = {
    en: 'EN',
    de: 'DE',
    ar: 'AR',
    tr: 'TR',
    ru: 'RU',
    zh: 'ZH',
    he: 'HE',
  }[localArticle.originalLanguage] || localArticle.originalLanguage.toUpperCase();

  const cardContent = (
    <article className="rounded-lg border border-gray-700 bg-gray-800 p-4 transition-shadow hover:shadow-lg">
      {/* Thumbnail image with ResponsiveImage */}
      {localArticle.imageUrl && (
        <ResponsiveImage
          src={localArticle.imageUrl}
          alt={localArticle.title}
          priority={priority}
          aspectRatio="16:9"
          className="-mx-4 -mt-4 mb-4 h-40 rounded-t-lg"
        />
      )}

      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium text-white',
              getRegionColor(localArticle.perspective)
            )}
          >
            {localArticle.source.name}
          </span>
          <span className="text-xs text-gray-500">
            {localArticle.source.country}
          </span>
          {needsTranslation && (
            <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
              {languageLabel}
            </span>
          )}
          {localArticle.confidence !== undefined && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-xs font-medium flex items-center gap-1',
                localArticle.confidence >= 75
                  ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
                  : localArticle.confidence >= 50
                  ? 'bg-[#ffee00]/20 text-[#ffee00] border border-[#ffee00]/30'
                  : 'bg-[#ff6600]/20 text-[#ff6600] border border-[#ff6600]/30'
              )}
              title={`Confidence: ${localArticle.confidence}% (based on source count, diversity, and reliability)`}
            >
              <Shield className="h-2.5 w-2.5" />
              {localArticle.confidence}%
            </span>
          )}
          {/* Phase 38: source-level credibility + bias badges */}
          {credibility ? (
            <CredibilityPill score={credibility.score} confidence={credibility.confidence} />
          ) : null}
          <BiasBadge politicalBias={localArticle.source.bias.political} />
        </div>
        <div className="flex items-center gap-1">
          <BookmarkButton
            articleId={localArticle.id}
            isBookmarked={bookmarked}
            onPersonalBookmark={() => toggleBookmark(localArticle.id)}
          />
        </div>
      </div>

      <Link
        to={`/article/${localArticle.id}`}
        onClick={trackReading}
        className="block mb-2"
      >
        <h3 className="text-lg font-semibold text-white leading-tight hover:text-[#00f0ff] transition-colors">
          {getDisplayTitle()}
        </h3>
      </Link>

      <p className="mb-3 text-sm text-gray-400 line-clamp-3">
        {getDisplayContent()}
      </p>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-gray-500">
            {formatDateTime(localArticle.publishedAt)}
          </span>
          <span className={cn('font-medium', getSentimentColor(localArticle.sentiment))}>
            {localArticle.sentiment === 'positive' && '+ Positiv'}
            {localArticle.sentiment === 'negative' && '- Negativ'}
            {localArticle.sentiment === 'neutral' && '○ Neutral'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Propaganda Analysis Button */}
          <button
            onClick={propagandaAnalysis ? () => setShowAnalysis(!showAnalysis) : handleAnalyze}
            disabled={isAnalyzing}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-xs transition-all',
              propagandaAnalysis
                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
            title="Analyze for propaganda indicators"
          >
            {isAnalyzing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
            {propagandaAnalysis ? (showAnalysis ? 'Hide' : 'Analysis') : 'Analyze'}
          </button>

          {needsTranslation && (
            <>
              {hasTranslation ? (
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-600"
                >
                  <Globe className="h-3 w-3" />
                  {showOriginal ? 'Ubersetzt' : 'Original'}
                </button>
              ) : onTranslate && (
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isTranslating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Languages className="h-3 w-3" />
                  )}
                  Ubersetzen
                </button>
              )}
              {localArticle.translationQuality !== undefined && hasTranslation && !showOriginal && (
                <span className="text-gray-500" title="Ubersetzungsqualitat">
                  {Math.round(localArticle.translationQuality * 100)}%
                </span>
              )}
            </>
          )}
          <Link
            to={`/article/${localArticle.id}`}
            onClick={trackReading}
            className="flex items-center gap-1 text-[#00f0ff] hover:text-[#00f0ff]/80"
          >
            <MessageSquare className="h-3 w-3" />
            Comments
          </Link>
          <a
            href={localArticle.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackReading}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="h-3 w-3" />
            Original
          </a>

          {/* Share button per D-01 */}
          {shareUrls && shareCode ? (
            <ShareButtons
              shareCode={shareCode}
              title={localArticle.title}
              urls={shareUrls}
              className="ml-2"
            />
          ) : (
            <button
              onClick={(e) => handleShare(e)}
              disabled={isCreatingShare}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-1 text-xs transition-all ml-2',
                'bg-gray-700 text-gray-300 hover:bg-gray-600'
              )}
              title="Create share link"
            >
              {isCreatingShare ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Share2 className="h-3 w-3" />
              )}
              Share
            </button>
          )}
        </div>
      </div>

      {/* Propaganda Analysis Panel */}
      {showAnalysis && propagandaAnalysis && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#00f0ff]" />
              Propaganda Analysis
            </h4>
            <button
              onClick={() => setShowAnalysis(false)}
              className="p-1 rounded hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="relative w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(${getScoreColor(propagandaAnalysis.score)} ${propagandaAnalysis.score}%, transparent ${propagandaAnalysis.score}%)`,
              }}
            >
              <div className="absolute inset-1 bg-gray-800 rounded-full flex items-center justify-center">
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: getScoreColor(propagandaAnalysis.score) }}
                >
                  {propagandaAnalysis.score}
                </span>
              </div>
            </div>
            <div>
              <span
                className="text-sm font-semibold"
                style={{ color: getScoreColor(propagandaAnalysis.score) }}
              >
                {getScoreLabel(propagandaAnalysis.score)}
              </span>
              <p className="text-xs text-gray-500">Propaganda Score</p>
            </div>
          </div>

          {/* Summary */}
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            {propagandaAnalysis.summary}
          </p>

          {/* Indicators */}
          {propagandaAnalysis.indicators.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Detected Indicators
              </p>
              <div className="space-y-2">
                {propagandaAnalysis.indicators.slice(0, 3).map((indicator, index) => (
                  <div
                    key={index}
                    className="rounded-lg border px-3 py-2"
                    style={{
                      borderColor: `${getSeverityColor(indicator.severity)}30`,
                      backgroundColor: `${getSeverityColor(indicator.severity)}10`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${getSeverityColor(indicator.severity)}20`,
                          color: getSeverityColor(indicator.severity),
                        }}
                      >
                        {indicator.severity}
                      </span>
                      <span className="text-xs text-gray-300 font-medium">
                        {indicator.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{indicator.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {propagandaAnalysis.recommendations.length > 0 && (
            <div className="rounded-lg bg-[#00f0ff]/5 border border-[#00f0ff]/20 p-3">
              <p className="text-[10px] text-[#00f0ff] uppercase tracking-wider mb-2 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Recommendations
              </p>
              <ul className="space-y-1">
                {propagandaAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-gray-400 flex items-start gap-2">
                    <Info className="h-3 w-3 text-[#00f0ff] flex-shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Analysis Error */}
      {analysisError && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="rounded-lg bg-[#ff0044]/10 border border-[#ff0044]/30 p-3 text-xs text-[#ff0044]">
            {analysisError}
          </div>
        </div>
      )}
    </article>
  );

  // Wrap with SwipeableCard on mobile for swipe-to-bookmark gesture
  if (isMobile) {
    return (
      <SwipeableCard onBookmark={handleBookmark} isBookmarked={bookmarked}>
        {cardContent}
      </SwipeableCard>
    );
  }

  return cardContent;
}
