/**
 * EmbeddedVideo dispatcher (Phase 40-05 / Task 12, extended Phase 40-06 / CC-05).
 *
 * Picks the right lite-loader based on either:
 *   - a `url` prop (parsed via URL constructor) → youtube.com/watch?v=ID,
 *     youtu.be/ID, or vimeo.com/ID
 *   - explicit `provider` + `videoId` props (skips URL parsing)
 *
 * Unrecognized URLs are silently dropped (renders null + warns to console).
 *
 * 40-06 extension: when `videoRowId` is provided (the Prisma Video.id, not
 * the platform-specific YouTube/Vimeo id), a "Show transcript" toggle is
 * rendered below the player. Clicking opens a TranscriptDrawer; clicking a
 * transcript segment posts a `seekTo` message to the YouTube iframe with
 * its origin pinned to youtube-nocookie.com (T-40-06-04). Vimeo's
 * postMessage protocol is similarly implemented when iframe is available.
 *
 * Inbound message origin guard (T-40-06-04): we don't currently consume
 * inbound iframe messages, but the listener is registered so any future
 * bidirectional feature is origin-safe by default.
 */

import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LiteYouTubeEmbed } from './LiteYouTubeEmbed';
import { LiteVimeoEmbed } from './LiteVimeoEmbed';
import { TranscriptDrawer } from '../podcasts/TranscriptDrawer';
import { cn } from '../../lib/utils';
import { parseVideoUrl, type Provider } from './parseVideoUrl';

interface CommonProps {
  /** Optional Prisma Video.id; when present, enables the transcript toggle. */
  videoRowId?: string;
  title?: string;
  className?: string;
}

interface PropsByUrl extends CommonProps {
  url: string;
}

interface PropsById extends CommonProps {
  provider: Provider;
  videoId: string;
}

type Props = PropsByUrl | PropsById;

const YT_NOCOOKIE_ORIGIN = 'https://www.youtube-nocookie.com';
const VIMEO_ORIGIN = 'https://player.vimeo.com';

export function EmbeddedVideo(props: Props) {
  const { t } = useTranslation('videos');
  const [showTranscript, setShowTranscript] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // T-40-06-04: register inbound origin guard. We don't consume any
  // bidirectional traffic today, but pinning here makes it safe by default
  // if a future feature reads back from the iframe.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.origin !== YT_NOCOOKIE_ORIGIN &&
        event.origin !== VIMEO_ORIGIN
      ) {
        return;
      }
      // intentionally no-op — currently we only POST out, not in.
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  let provider: Provider;
  let videoId: string;

  if ('url' in props) {
    const parsed = parseVideoUrl(props.url);
    if (!parsed) {
      // eslint-disable-next-line no-console
      console.warn('EmbeddedVideo: unrecognized URL', props.url);
      return null;
    }
    provider = parsed.provider;
    videoId = parsed.id;
  } else {
    provider = props.provider;
    videoId = props.videoId;
  }

  const title = props.title ?? '';
  const className = props.className;
  const videoRowId = props.videoRowId;

  /**
   * Seek the active iframe player. If the lite-loader hasn't been
   * activated yet (thumbnail still showing), silently no-op.
   */
  const handleSeek = (seconds: number) => {
    const iframe = containerRef.current?.querySelector('iframe');
    if (!iframe?.contentWindow) return;
    if (provider === 'youtube') {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true],
        }),
        YT_NOCOOKIE_ORIGIN,
      );
    } else {
      iframe.contentWindow.postMessage(
        JSON.stringify({ method: 'setCurrentTime', value: seconds }),
        VIMEO_ORIGIN,
      );
    }
  };

  const player =
    provider === 'youtube' ? (
      <LiteYouTubeEmbed videoId={videoId} title={title} />
    ) : (
      <LiteVimeoEmbed vimeoId={videoId} />
    );

  // No transcript surface — preserve original signature for callers that
  // don't pass videoRowId (RelatedVideos still renders without transcripts).
  if (!videoRowId) {
    return <div className={className}>{player}</div>;
  }

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      {player}
      <button
        type="button"
        onClick={() => setShowTranscript((v) => !v)}
        aria-expanded={showTranscript}
        data-testid="video-transcript-toggle"
        className="inline-flex items-center gap-1.5 rounded-md border border-[#00f0ff]/30 bg-black/30 px-2 py-1 text-xs font-mono text-[#00f0ff] hover:bg-[#00f0ff]/10"
      >
        <FileText className="h-3 w-3" />
        <span>{showTranscript ? t('transcript.hide') : t('transcript.show')}</span>
      </button>
      {showTranscript && (
        <TranscriptDrawer
          contentType="video"
          id={videoRowId}
          onSeek={handleSeek}
          className="rounded-lg border border-gray-800 bg-black/40"
        />
      )}
    </div>
  );
}
