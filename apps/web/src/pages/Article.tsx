import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ExternalLink,
  Bookmark,
  Clock,
  Globe,
  Languages,
  Loader2,
  Share2,
} from 'lucide-react';
import { CommentSection } from '../components/comments/CommentSection';
import { ResponsiveImage } from '../components/ResponsiveImage';
import { ShareButtons } from '../components/sharing';
import { useCreateShare, type ShareUrls } from '../hooks/useShare';
import { useAppStore } from '../store';
import { cn, getRegionColor, getSentimentColor } from '../lib/utils';
import { formatDateTime } from '../lib/formatters';
import type { NewsArticle } from '../types';
import { useState } from 'react';

interface ArticleResponse {
  success: boolean;
  data?: NewsArticle;
  error?: string;
}

async function fetchArticle(articleId: string): Promise<NewsArticle> {
  const response = await fetch(`/api/news/${articleId}`);
  if (!response.ok) {
    throw new Error('Article not found');
  }
  const data: ArticleResponse = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch article');
  }
  return data.data;
}

export function Article() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { language, toggleBookmark, isBookmarked, addToReadingHistory } = useAppStore();
  const [showOriginal, setShowOriginal] = useState(false);
  const [shareUrls, setShareUrls] = useState<ShareUrls | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const createShare = useCreateShare();

  const {
    data: article,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['article', id],
    queryFn: () => fetchArticle(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Track reading when article loads
  if (article && id) {
    addToReadingHistory(id);
  }

  const bookmarked = id ? isBookmarked(id) : false;

  const handleShare = async () => {
    if (!article || shareUrls || isCreatingShare) return;
    setIsCreatingShare(true);
    try {
      const urls = await createShare.mutateAsync(article);
      setShareUrls(urls);
      setShareCode(urls.direct.split('/s/')[1]);
    } catch (err) {
      console.error('Failed to create share:', err);
    } finally {
      setIsCreatingShare(false);
    }
  };

  const getDisplayTitle = () => {
    if (!article) return '';
    if (showOriginal) return article.title;
    if (language === 'de' && article.titleTranslated?.de) {
      return article.titleTranslated.de;
    }
    if (language === 'en' && article.titleTranslated?.en) {
      return article.titleTranslated.en;
    }
    return article.title;
  };

  const getDisplayContent = () => {
    if (!article) return '';
    if (showOriginal) return article.content;
    if (language === 'de' && article.contentTranslated?.de) {
      return article.contentTranslated.de;
    }
    if (language === 'en' && article.contentTranslated?.en) {
      return article.contentTranslated.en;
    }
    return article.content;
  };

  const hasTranslation = article
    ? language === 'de'
      ? !!article.titleTranslated?.de
      : !!article.titleTranslated?.en
    : false;

  const needsTranslation = article ? article.originalLanguage !== language : false;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#00f0ff] mx-auto" />
          <p className="mt-4 text-sm font-mono text-[#00f0ff]/50 uppercase tracking-widest">
            Loading article...
          </p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Article not found</h2>
          <p className="text-gray-400 mb-4">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const languageLabel = {
    en: 'EN',
    de: 'DE',
    ar: 'AR',
    tr: 'TR',
    ru: 'RU',
    zh: 'ZH',
    he: 'HE',
  }[article.originalLanguage] || article.originalLanguage.toUpperCase();

  return (
    <div className="min-h-screen pb-12">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-[#00f0ff] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-mono text-sm">Back to Dashboard</span>
        </Link>
      </div>

      {/* Article Container */}
      <article className="max-w-3xl mx-auto" data-testid="article-container">
        {/* Hero Image */}
        {article.imageUrl && (
          <ResponsiveImage
            src={article.imageUrl}
            alt={article.title}
            priority={true}
            aspectRatio="16:9"
            className="w-full h-64 md:h-80 rounded-lg mb-6 object-cover"
          />
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span
            className={cn(
              'rounded px-3 py-1 text-sm font-medium text-white',
              getRegionColor(article.perspective)
            )}
          >
            {article.source.name}
          </span>
          <span className="text-sm text-gray-500">{article.source.country}</span>
          {needsTranslation && (
            <span className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-400 font-mono">
              {languageLabel}
            </span>
          )}
          <span className={cn('text-sm font-medium', getSentimentColor(article.sentiment))}>
            {article.sentiment === 'positive' && '+ Positive'}
            {article.sentiment === 'negative' && '- Negative'}
            {article.sentiment === 'neutral' && '○ Neutral'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-4">
          {getDisplayTitle()}
        </h1>

        {/* Timestamp & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{formatDateTime(article.publishedAt)}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Translation Toggle */}
            {needsTranslation && hasTranslation && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
              >
                {showOriginal ? <Languages className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                {showOriginal ? t('article.showTranslation', 'Translated') : t('article.showOriginal', 'Original')}
              </button>
            )}

            {/* Bookmark */}
            <button
              onClick={() => id && toggleBookmark(id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                bookmarked
                  ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              )}
            >
              <Bookmark className="h-4 w-4" fill={bookmarked ? 'currentColor' : 'none'} />
              {bookmarked ? t('article.bookmarked', 'Bookmarked') : t('article.bookmark', 'Bookmark')}
            </button>

            {/* Share */}
            {shareUrls && shareCode ? (
              <ShareButtons
                shareCode={shareCode}
                title={article.title}
                urls={shareUrls}
              />
            ) : (
              <button
                onClick={handleShare}
                disabled={isCreatingShare}
                className="flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors"
              >
                {isCreatingShare ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                {t('article.share', 'Share')}
              </button>
            )}

            {/* Original Link */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-[#00f0ff]/20 px-3 py-2 text-sm text-[#00f0ff] hover:bg-[#00f0ff]/30 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {t('article.readOriginal', 'Read Original')}
            </a>
          </div>
        </div>

        {/* Topics */}
        {article.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {article.topics.map((topic) => (
              <span
                key={topic}
                className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-400 font-mono"
              >
                #{topic}
              </span>
            ))}
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
            {getDisplayContent()}
          </div>
        </div>

        {/* Translation Quality Indicator */}
        {!showOriginal && hasTranslation && article.translationQuality !== undefined && (
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
            <Languages className="h-4 w-4" />
            <span>
              {t('article.translationQuality', 'Translation quality')}: {Math.round(article.translationQuality * 100)}%
            </span>
          </div>
        )}

        {/* Comments Section */}
        <div className="max-w-3xl mx-auto">
          <CommentSection articleId={article.id} />
        </div>
      </article>
    </div>
  );
}

export default Article;
