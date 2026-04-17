import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { NewsCard } from '../components/NewsCard';
import type { NewsArticle } from '../types';

async function fetchArticleById(id: string): Promise<NewsArticle | null> {
  const response = await fetch(`/api/news/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch article');
  }
  const result = await response.json();
  return result.data;
}

async function fetchBookmarkedArticles(ids: string[]): Promise<NewsArticle[]> {
  const results = await Promise.all(ids.map(fetchArticleById));
  return results.filter((article): article is NewsArticle => article !== null);
}

async function translateArticle(
  articleId: string,
  targetLang: 'de' | 'en'
): Promise<NewsArticle | null> {
  const response = await fetch(`/api/news/${articleId}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetLang }),
  });
  if (!response.ok) {
    throw new Error('Failed to translate article');
  }
  const result = await response.json();
  return result.data;
}

export function Bookmarks() {
  const { bookmarkedArticles, toggleBookmark } = useAppStore();
  const queryClient = useQueryClient();

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['bookmarked-articles', bookmarkedArticles],
    queryFn: () => fetchBookmarkedArticles(bookmarkedArticles),
    enabled: bookmarkedArticles.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const translateMutation = useMutation({
    mutationFn: ({ articleId, targetLang }: { articleId: string; targetLang: 'de' | 'en' }) =>
      translateArticle(articleId, targetLang),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarked-articles'] });
    },
  });

  const handleTranslate = async (articleId: string, targetLang: 'de' | 'en') => {
    return translateMutation.mutateAsync({ articleId, targetLang });
  };

  const handleClearAll = () => {
    bookmarkedArticles.forEach((id) => toggleBookmark(id));
  };

  if (bookmarkedArticles.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Gespeicherte Artikel</h1>
        <p className="text-gray-400">
          Deine markierten Artikel zum spateren Lesen.
        </p>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bookmark className="mb-4 h-16 w-16 text-gray-500" />
          <p className="text-gray-400">Keine gespeicherten Artikel</p>
          <p className="mt-2 text-sm text-gray-500">
            Klicke auf das Lesezeichen-Symbol bei einem Artikel, um ihn zu speichern.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Gespeicherte Artikel</h1>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
          <p className="text-gray-400">Fehler beim Laden der Artikel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gespeicherte Artikel</h1>
          <p className="text-gray-400">
            Deine markierten Artikel zum spateren Lesen.
          </p>
        </div>
        {bookmarkedArticles.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm text-red-400 hover:bg-red-600/30"
          >
            <Trash2 className="h-4 w-4" />
            Alle entfernen
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {articles?.length || 0} von {bookmarkedArticles.length} Artikel verfugbar
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles?.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                onTranslate={handleTranslate}
              />
            ))}
          </div>

          {articles && articles.length < bookmarkedArticles.length && (
            <p className="text-sm text-gray-500">
              Einige Artikel sind nicht mehr verfugbar und wurden aus dem Server entfernt.
            </p>
          )}
        </>
      )}
    </div>
  );
}
