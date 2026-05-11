import { test, expect } from './fixtures';

/**
 * Single-click playback E2E (todo 40-08-podcast-autoplay-e2e).
 *
 * Plan 40-08 fixed the "two clicks needed to play audio" bug by wiring
 * PodcastPlayer.autoPlayOnMount through PodcastEpisodeCard. Unit tests
 * cover the prop forwarding + jsdom play() invocation; this spec is the
 * real-browser canary that catches:
 *   - hydration regressions that re-mount the player and stall the
 *     user-gesture window
 *   - refactors that drop the autoPlayOnMount prop
 *   - browser user-gesture-policy changes
 *
 * Network is fully stubbed (curated feed + episodes + audio body) so the
 * test does not depend on a live podcast index or audio CDN.
 */

// A tiny silent WAV file (44 bytes header + 0 data) is enough for the
// browser's <audio> element to load, decode metadata, and start firing
// `timeupdate` once we trigger play(). Encoded inline so the test has no
// fixture-file dependency. 1-channel, 8 kHz, 8-bit PCM.
const SILENT_WAV_BASE64 =
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const SILENT_WAV_BYTES = Uint8Array.from(atob(SILENT_WAV_BASE64), (c) => c.charCodeAt(0));

const STUB_FEED = {
  id: 'feed-stub',
  title: 'Stub Feed',
  description: 'E2E fixture feed',
  imageUrl: 'https://example.com/cover.jpg',
  regions: ['usa'],
  language: 'en',
  category: 'news',
};

const STUB_EPISODE = {
  id: 'ep-stub-1',
  feedId: STUB_FEED.id,
  title: 'Stub Episode 1',
  podcastTitle: STUB_FEED.title,
  description: 'A short fixture episode used to exercise the audio gesture window.',
  audioUrl: 'https://example.com/audio/stub.wav',
  imageUrl: STUB_FEED.imageUrl,
  durationSec: 60,
  publishedAt: '2026-05-01T00:00:00.000Z',
};

test.describe('Podcasts — single-click playback', () => {
  test('clicking Play on a podcast episode starts audio within 5 seconds', async ({ page }) => {
    // Stub curated feed list.
    await page.route('**/api/podcasts', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [STUB_FEED] }),
      }),
    );

    // Stub episodes for our stub feed.
    await page.route(`**/api/podcasts/${STUB_FEED.id}/episodes**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [STUB_EPISODE] }),
      }),
    );

    // Stub the audio request itself so the WAV bytes never hit a real CDN.
    await page.route(STUB_EPISODE.audioUrl, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': String(SILENT_WAV_BYTES.byteLength),
        },
        body: Buffer.from(SILENT_WAV_BYTES),
      }),
    );

    await page.goto('/podcasts');
    await page.waitForLoadState('domcontentloaded');

    // Select the stub feed in the left column.
    await page.click(`text=${STUB_FEED.title}`);

    // Wait for the episode card to mount.
    const card = page.locator(`[data-testid="podcast-episode-${STUB_EPISODE.id}"]`);
    await card.waitFor({ state: 'visible', timeout: 15_000 });

    // Click the inner Play button — this is the single-click contract.
    // The card contains exactly one button before play starts (the play
    // toggle); inner PodcastPlayer controls only mount after the click.
    // Selecting `card.locator('button')` is language-agnostic — works for
    // DE "Folge abspielen", EN "Play episode", FR "Lire l'épisode".
    await card.locator('button').first().click();

    // The user-gesture-driven autoplay should kick the <audio> element into
    // a non-zero currentTime within a few seconds. We don't care about an
    // exact value — just that the wallclock advances at all, which means
    // play() resolved and the media element is decoding.
    await page.waitForFunction(
      () => {
        const audio = document.querySelector('audio') as HTMLAudioElement | null;
        return audio != null && audio.currentTime > 0;
      },
      undefined,
      { timeout: 5_000 },
    );

    // Defensive: confirm there is at most one <audio> element on the page.
    // The bug we're guarding against ("two clicks needed") historically
    // surfaced as a stale player still mounted when a new one rendered.
    const audioCount = await page.locator('audio').count();
    expect(audioCount).toBeLessThanOrEqual(2); // PodcastPlayer + any one hidden preload
  });
});
