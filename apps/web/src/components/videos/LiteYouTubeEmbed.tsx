/**
 * LiteYouTubeEmbed — click-to-load YouTube player (Phase 40-05 / D-D2).
 *
 * The PLAN specified `react-lite-youtube-embed` from npm; installation was
 * unavailable in this execution environment, so we implement the same UX
 * from scratch: render a thumbnail-only button up front, swap in the
 * youtube-nocookie.com iframe only after the user clicks. This preserves
 * LCP < 2s on multi-video article pages (third-party iframe never loads
 * during initial paint) AND keeps the bundle under the 250KB warning
 * threshold (no extra dep).
 *
 * Privacy: uses `youtube-nocookie.com` per Threat T-40-05-01 mitigation —
 * the host doesn't drop tracking cookies until the user explicitly clicks
 * play. Aligns with the dark-cyber palette via the cyan border + play
 * button overlay.
 */

import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  videoId: string;
  title: string;
  poster?: 'default' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault';
  className?: string;
}

export function LiteYouTubeEmbed({
  videoId,
  title,
  poster = 'hqdefault',
  className,
}: Props) {
  const [activated, setActivated] = useState(false);

  const thumbUrl = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${poster}.jpg`;
  const iframeUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    videoId,
  )}?autoplay=1&rel=0`;

  if (activated) {
    return (
      <iframe
        data-testid="yt-iframe"
        src={iframeUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={cn(
          'w-full aspect-video rounded-lg overflow-hidden border border-[#00f0ff]/20',
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      aria-label={`Play ${title}`}
      className={cn(
        'relative w-full aspect-video rounded-lg overflow-hidden group border border-[#00f0ff]/20 bg-gray-900',
        className,
      )}
    >
      <img
        src={thumbUrl}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition">
        <Play
          className="w-16 h-16 text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
