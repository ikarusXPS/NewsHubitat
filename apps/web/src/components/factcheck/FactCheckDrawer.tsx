import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFactCheck } from '../../hooks/useFactCheck';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import { VerdictPill } from './VerdictPill';
import { CitationCard } from './CitationCard';

export interface FactCheckDrawerProps {
  /** The user-highlighted text to fact-check. `null` hides the drawer. */
  claim: string | null;
  articleId?: string;
  onClose: () => void;
  className?: string;
}

/**
 * Inline fact-check drawer (D-07 LOCKED) that owns the mutation lifecycle.
 *
 * Renders below the article body. Article.tsx lifts the selected-claim state
 * (set by FactCheckButton.onClaim) and passes it here as `claim`. When a new
 * claim arrives, this drawer kicks off the mutation and renders:
 *   - loading spinner while in-flight
 *   - VerdictPill + confidence + methodology + up to 5 CitationCards on success
 *   - upgrade prompt + /pricing link on 429 RATE_LIMIT (D-09)
 *   - validation hint on 400 (server-side claim length / injection check)
 *   - generic error message on other failures
 *
 * The methodology is rendered as `whitespace-pre-wrap` text since
 * `react-markdown` is not in the apps/web dependency set.
 */
export function FactCheckDrawer({ claim, articleId, onClose, className }: FactCheckDrawerProps) {
  const { t } = useTranslation(['factcheck', 'credibility']);
  const language = useAppStore((s) => s.language);
  const mutation = useFactCheck();

  // Run the mutation each time a new claim is selected. We intentionally do
  // not depend on `mutation.mutate` (its identity changes per render) — keying
  // on `claim` is enough; React's StrictMode double-invoke guard is benign
  // here because `useFactCheck` is a request-response mutation, not a
  // subscription, and the server-side cache makes duplicate requests cheap.
  useEffect(() => {
    if (claim) {
      mutation.mutate({ claim, articleId, language: language as 'de' | 'en' | 'fr' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim, articleId, language]);

  if (!claim) return null;

  const errorMessage = mutation.error?.message ?? '';
  const isRateLimit = errorMessage.startsWith('RATE_LIMIT:');
  const isValidationError = errorMessage.startsWith('VALIDATION:');
  const upgradeUrl = isRateLimit ? errorMessage.slice('RATE_LIMIT:'.length) : '/pricing';

  return (
    <div
      className={cn('glass-panel rounded-xl p-4 space-y-3 my-4', className)}
      role="region"
      aria-label={t('factcheck:drawer.title') as string}
    >
      <div className="flex items-start justify-between">
        <h3 className="signal-label">{t('factcheck:drawer.title')}</h3>
        <button
          onClick={onClose}
          aria-label={t('factcheck:drawer.close') as string}
          className="text-gray-500 hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Echo the user's claim so they can confirm what was checked. */}
      <blockquote className="text-xs text-gray-400 italic border-l-2 border-gray-700 pl-3">
        &ldquo;{claim.length > 200 ? claim.slice(0, 200) + '…' : claim}&rdquo;
      </blockquote>

      {mutation.isPending ? (
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('factcheck:button.loading')}</span>
        </div>
      ) : null}

      {isRateLimit ? (
        <div className="text-sm text-[#ffee00] space-y-2">
          <p>{t('factcheck:error.rateLimit')}</p>
          <a href={upgradeUrl} className="inline-block text-[#00f0ff] hover:underline">
            → {upgradeUrl}
          </a>
        </div>
      ) : null}

      {isValidationError ? (
        <p className="text-sm text-[#ff0044]">{t('factcheck:error.rejected')}</p>
      ) : null}

      {mutation.error && !isRateLimit && !isValidationError ? (
        <p className="text-sm text-[#ff0044]">{t('factcheck:error.generic')}</p>
      ) : null}

      {mutation.data ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <VerdictPill verdict={mutation.data.verdict} />
            <span className="text-xs text-gray-400">
              {t(`credibility:confidence.${mutation.data.confidenceBucket}`)}
              {' · '}
              {mutation.data.confidence}%
            </span>
          </div>

          <div className="text-xs">
            <h4 className="text-gray-400 uppercase tracking-wide mb-1">
              {t('factcheck:drawer.methodology')}
            </h4>
            <div className="text-gray-300 whitespace-pre-wrap">
              {mutation.data.methodologyMd}
            </div>
          </div>

          <div>
            <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              {t('factcheck:drawer.citations')} ({mutation.data.citations.length})
            </h4>
            {mutation.data.citations.length === 0 ? (
              <p className="text-xs text-gray-500 italic">{t('factcheck:drawer.noCitations')}</p>
            ) : (
              <div className="space-y-1.5">
                {mutation.data.citations.slice(0, 5).map((c) => (
                  <CitationCard key={c.articleId} citation={c} />
                ))}
              </div>
            )}
          </div>

          {mutation.data.verdict === 'unverified' ? (
            <p className="text-[10px] text-gray-500 italic border-t border-gray-700/30 pt-2">
              {t('factcheck:unverified.explanation')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
