/**
 * Shared transcript types (Phase 40-06 / CC-05).
 *
 * The frontend mirrors the backend `TranscriptSegment` shape exposed by
 * `apps/web/server/services/whisperService.ts`. Keeping a tiny dedicated
 * type module avoids importing server modules into client bundles.
 */

export type ContentType = 'podcast' | 'video';

export type TranscriptProvider =
  | 'youtube-captions'
  | 'whisper'
  | 'publisher-rss'
  | 'unavailable';

export interface TranscriptSegment {
  startSec: number;
  endSec: number;
  text: string;
}

export interface TranscriptResponse {
  id: string;
  contentType: ContentType;
  contentId: string;
  language: string;
  segments: TranscriptSegment[];
  provider: TranscriptProvider;
  /** ISO-8601 string when over the wire; Date after parse if needed. */
  transcribedAt: string;
}
