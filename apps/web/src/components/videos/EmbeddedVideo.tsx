/**
 * EmbeddedVideo dispatcher (Phase 40-05 / Task 12).
 *
 * Picks the right lite-loader based on either:
 *   - a `url` prop (parsed via URL constructor) → youtube.com/watch?v=ID,
 *     youtu.be/ID, or vimeo.com/ID
 *   - explicit `provider` + `videoId` props (skips URL parsing)
 *
 * Unrecognized URLs are silently dropped (renders null + warns to console).
 * This is the embed-side counterpart to RelatedVideos: when an article body
 * carries a vimeo.com link the dispatcher routes to LiteVimeoEmbed; the
 * worker-indexed catalogue surfaces YouTube videos exclusively.
 */

import { LiteYouTubeEmbed } from './LiteYouTubeEmbed';
import { LiteVimeoEmbed } from './LiteVimeoEmbed';

type Provider = 'youtube' | 'vimeo';

interface PropsByUrl {
  url: string;
  title?: string;
  className?: string;
}

interface PropsById {
  provider: Provider;
  videoId: string;
  title?: string;
  className?: string;
}

type Props = PropsByUrl | PropsById;

/** Returns `{ provider, id }` or null if URL unrecognized. */
export function parseVideoUrl(url: string): { provider: Provider; id: string } | null {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtube-nocookie.com')) {
      const v = u.searchParams.get('v');
      if (v) return { provider: 'youtube', id: v };
      // youtube.com/embed/ID
      const m = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)/);
      if (m) return { provider: 'youtube', id: m[1] };
    }
    // youtu.be/ID
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      if (id) return { provider: 'youtube', id };
    }
    // vimeo.com/ID
    if (u.hostname.includes('vimeo.com')) {
      const m = u.pathname.match(/^\/(\d+)/);
      if (m) return { provider: 'vimeo', id: m[1] };
    }
  } catch {
    /* invalid URL constructor input */
  }
  return null;
}

export function EmbeddedVideo(props: Props) {
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

  return provider === 'youtube' ? (
    <LiteYouTubeEmbed videoId={videoId} title={title} className={className} />
  ) : (
    <LiteVimeoEmbed vimeoId={videoId} className={className} />
  );
}
