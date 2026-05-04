/**
 * TranscriptSegment — single timestamped segment row (Phase 40-06 / CC-05).
 *
 * Renders the start timestamp + body text as a button. Clicking fires
 * `onSeek(segment.startSec)`; the parent (PodcastPlayer or YouTube iframe
 * postMessage) handles the actual seek. When `onSeek` is omitted the row
 * is read-only.
 */

import { cn } from '../../lib/utils';
import type { TranscriptSegment as Segment } from '../../types/transcripts';

function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

export interface TranscriptSegmentProps {
  segment: Segment;
  onSeek?: (seconds: number) => void;
  className?: string;
}

export function TranscriptSegment({
  segment,
  onSeek,
  className,
}: TranscriptSegmentProps) {
  const handleClick = () => onSeek?.(segment.startSec);
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!onSeek}
      data-testid="transcript-segment"
      data-start-sec={segment.startSec}
      className={cn(
        'w-full text-left py-2 px-2 hover:bg-white/5 flex gap-3 text-sm',
        'disabled:cursor-default disabled:hover:bg-transparent',
        className,
      )}
    >
      <span className="font-mono text-[#00f0ff] shrink-0 w-12 tabular-nums">
        {formatTimestamp(segment.startSec)}
      </span>
      <span className="text-gray-200">{segment.text}</span>
    </button>
  );
}
