/**
 * URL parser for embedded video providers.
 *
 * Extracted from EmbeddedVideo.tsx to satisfy the
 * `react-refresh/only-export-components` rule (Vite Fast Refresh requires
 * component files to export only components — non-component exports must
 * live in a separate module).
 */

export type Provider = 'youtube' | 'vimeo';

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
