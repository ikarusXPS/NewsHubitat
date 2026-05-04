/**
 * LiteVimeoEmbed — click-to-load Vimeo player (Phase 40-05 / D-D2).
 *
 * Mirrors LiteYouTubeEmbed UX: render a thumbnail-only button up front,
 * swap in the player.vimeo.com iframe only after the user clicks. Uses
 * the public Vimeo oEmbed JSON endpoint to fetch `thumbnail_url` + `title`
 * once per ID; result is cached in localStorage under
 * `vimeo:oembed:${vimeoId}` to avoid refetching across NewsCard mounts.
 *
 * Failure mode: if oEmbed fails (offline / 404), the button still renders
 * with a generic title — defensive fallback so the lite-loader never
 * leaves the user with a broken layout.
 */

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  vimeoId: string;
  className?: string;
}

interface OEmbed {
  thumbnail_url: string;
  title: string;
}

const CACHE_KEY = (id: string): string => `vimeo:oembed:${id}`;

function readCache(id: string): OEmbed | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY(id));
    return raw ? (JSON.parse(raw) as OEmbed) : null;
  } catch {
    return null;
  }
}

function writeCache(id: string, value: OEmbed): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY(id), JSON.stringify(value));
  } catch {
    // localStorage quota exhausted — silent ignore
  }
}

export function LiteVimeoEmbed({ vimeoId, className }: Props) {
  const [meta, setMeta] = useState<OEmbed | null>(() => readCache(vimeoId));
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (meta) return; // cache hit
    let cancelled = false;
    fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${encodeURIComponent(
        vimeoId,
      )}`,
    )
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`vimeo oembed ${r.status}`))))
      .then((data: OEmbed) => {
        if (cancelled) return;
        setMeta(data);
        writeCache(vimeoId, data);
      })
      .catch(() => {
        if (!cancelled) setMeta({ thumbnail_url: '', title: 'Vimeo Video' });
      });
    return () => {
      cancelled = true;
    };
  }, [vimeoId, meta]);

  if (activated) {
    return (
      <iframe
        data-testid="vimeo-iframe"
        src={`https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}?autoplay=1`}
        title={meta?.title ?? 'Vimeo video'}
        allow="autoplay; fullscreen; picture-in-picture"
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
      aria-label={`Play ${meta?.title ?? 'Vimeo video'}`}
      className={cn(
        'relative w-full aspect-video rounded-lg overflow-hidden group border border-[#00f0ff]/20 bg-gray-900',
        className,
      )}
    >
      {meta?.thumbnail_url ? (
        <img
          src={meta.thumbnail_url}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-full h-full bg-gray-800" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition">
        <Play
          className="w-16 h-16 text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
