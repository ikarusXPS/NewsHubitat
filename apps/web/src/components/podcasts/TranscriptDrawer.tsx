/**
 * TranscriptDrawer — Premium-gated transcript surface (Phase 40-06 / CC-01 / CC-05).
 *
 * Renders ONE of three branches based on tier × platform:
 *
 *   1. FREE on mobile (`isNativeApp() === true`): plain-text fallback per
 *      Apple Rule 3.1.1(a) / Phase 39 D-09. The string "newshub.example" is
 *      rendered inside `<span>`, NEVER inside `<a href>`. No /pricing
 *      reference. No useTranscript fetch fires.
 *
 *   2. FREE on web: `<UpgradePrompt feature="transcripts">` with the
 *      existing `/pricing` CTA path (matches CC-01 web behaviour). No
 *      useTranscript fetch fires.
 *
 *   3. PREMIUM (web or mobile): fetched transcript with timestamped
 *      `<TranscriptSegment>` rows + a client-side search input that filters
 *      segments. Clicking a segment fires `onSeek(segment.startSec)`.
 *
 * Server-side enforcement lives in `/api/transcripts/*` via
 * `requireTier('PREMIUM')`. This component is the UX layer only — it
 * conditionally renders the gate and never tries to bypass server checks.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { isNativeApp } from '../../lib/platform';
import { UpgradePrompt } from '../subscription/UpgradePrompt';
import { useTranscript } from '../../hooks/useTranscript';
import { TranscriptSegment } from './TranscriptSegment';
import { cn } from '../../lib/utils';
import type { ContentType } from '../../types/transcripts';

export interface TranscriptDrawerProps {
  contentType: ContentType;
  id: string;
  onSeek?: (seconds: number) => void;
  className?: string;
  /**
   * Current audio playback position in seconds. When provided, the
   * segment containing this position is highlighted and auto-scrolled
   * into view. Used to make Whisper timestamp inaccuracy navigable —
   * users can see where the audio is and click adjacent segments to
   * correct any drift.
   */
  currentSec?: number;
}

export function TranscriptDrawer({
  contentType,
  id,
  onSeek,
  className,
  currentSec,
}: TranscriptDrawerProps) {
  const namespace = contentType === 'podcast' ? 'podcasts' : 'videos';
  const { t } = useTranslation(namespace);
  const { user } = useAuth();
  const isPremium =
    user?.subscriptionTier === 'PREMIUM' ||
    user?.subscriptionTier === 'ENTERPRISE';
  const native = isNativeApp();
  const [search, setSearch] = useState('');

  const transcriptQuery = useTranscript(contentType, id, { enabled: isPremium });

  // Branch 1: FREE on mobile — plain-text fallback (Apple Rule 3.1.1(a)).
  if (!isPremium && native) {
    return (
      <div
        data-testid="transcript-drawer-mobile-free"
        className={cn('p-4 text-sm text-gray-300 font-mono', className)}
      >
        {t('transcript.premium.mobile')}{' '}
        <span className="font-mono">newshub.example</span>
      </div>
    );
  }

  // Branch 2: FREE on web — UpgradePrompt with /pricing CTA.
  if (!isPremium) {
    return (
      <div
        data-testid="transcript-drawer-web-free"
        className={cn('p-4', className)}
      >
        <UpgradePrompt feature={t('transcript.heading')}>
          <div className="h-32 bg-black/40 rounded-lg" aria-hidden />
        </UpgradePrompt>
      </div>
    );
  }

  // Branch 3: PREMIUM
  if (transcriptQuery.isLoading) {
    return (
      <div
        data-testid="transcript-drawer-loading"
        className={cn(
          'p-4 flex items-center gap-2 text-sm text-gray-300',
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('transcript.transcribing')}</span>
      </div>
    );
  }

  if (!transcriptQuery.data) {
    return (
      <div
        data-testid="transcript-drawer-empty"
        className={cn('p-4 text-sm text-gray-400', className)}
      >
        {t('transcript.unavailable')}
      </div>
    );
  }

  const segments = transcriptQuery.data.segments;
  const filtered = search.trim()
    ? segments.filter((s) =>
        s.text.toLowerCase().includes(search.toLowerCase()),
      )
    : segments;

  const activeIndex =
    currentSec !== undefined
      ? filtered.findIndex(
          (seg) => currentSec >= seg.startSec && currentSec < seg.endSec,
        )
      : -1;

  return (
    <div
      data-testid="transcript-drawer-premium"
      className={cn('p-4 space-y-2', className)}
    >
      <h3 className="text-sm font-semibold text-[#00f0ff] font-mono">
        {t('transcript.heading')}
      </h3>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('transcript.searchPlaceholder')}
        aria-label={t('transcript.searchPlaceholder')}
        className="w-full px-3 py-1.5 text-sm bg-black/40 border border-gray-700 rounded font-mono text-gray-200"
      />
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-800">
        {filtered.map((seg, i) => (
          <ActiveAwareSegment
            key={`${seg.startSec}-${i}`}
            segment={seg}
            onSeek={onSeek}
            isActive={i === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Wrapper around TranscriptSegment that auto-scrolls into view when this
 * segment becomes active (audio playback reached its time range) and
 * draws a cyber-accent border so the user can SEE where the audio is.
 * Bridges Whisper's ±2-5s timestamp drift — user clicks an adjacent
 * segment to correct if the highlighted line doesn't match what's heard.
 */
function ActiveAwareSegment({
  segment,
  onSeek,
  isActive,
}: {
  segment: { startSec: number; endSec: number; text: string };
  onSeek?: (s: number) => void;
  isActive: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);
  return (
    <div
      ref={ref}
      className={cn(
        'transition-colors',
        isActive && 'bg-[#00f0ff]/10 border-l-2 border-[#00f0ff]',
      )}
    >
      <TranscriptSegment segment={segment} onSeek={onSeek} />
    </div>
  );
}
