/**
 * Unit tests for TranscriptDrawer (Phase 40-06 / Task 7 / CC-01 / CC-05).
 *
 * Three load-bearing UI branches:
 *   1. FREE mobile: plain text + 'newshub.example' inside <span>, NOT <a>.
 *      No /pricing reference. (Apple Rule 3.1.1(a) compliance.)
 *   2. FREE web: UpgradePrompt with /pricing CTA. No 'newshub.example'.
 *   3. PREMIUM: fetched segments render via TranscriptSegment stubs;
 *      clicking a segment fires onSeek(startSec); search filters segments.
 *   4. Loading state shows the transcribing i18n key.
 *   5. Null transcript shows the unavailable i18n key.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

// react-i18next: pass keys through verbatim so tests can assert on them.
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

// AuthContext mock — controlled per test via mutable ref.
type MockUser = { subscriptionTier: 'FREE' | 'PREMIUM' | 'ENTERPRISE' } | null;
let currentUser: MockUser = null;
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

// platform mock
let nativeFlag = false;
vi.mock('../../../lib/platform', () => ({
  isNativeApp: () => nativeFlag,
}));

// useTranscript mock — controlled per test
type QueryState = {
  data: unknown;
  isLoading: boolean;
};
let queryResult: QueryState = { data: null, isLoading: false };
vi.mock('../../../hooks/useTranscript', () => ({
  useTranscript: () => queryResult,
}));

// TranscriptSegment stub — exposes startSec + click hook for assertion.
vi.mock('../TranscriptSegment', () => ({
  TranscriptSegment: (props: {
    segment: { startSec: number; text: string };
    onSeek?: (s: number) => void;
  }) => (
    <button
      data-testid="segment-stub"
      data-start-sec={props.segment.startSec}
      onClick={() => props.onSeek?.(props.segment.startSec)}
    >
      {props.segment.text}
    </button>
  ),
}));

import { TranscriptDrawer } from '../TranscriptDrawer';

function wrap(children: ReactNode) {
  return createElement(MemoryRouter, null, children);
}

describe('TranscriptDrawer', () => {
  it('FREE mobile: renders plain-text fallback with newshub.example as <span>, NO <a> link', () => {
    currentUser = { subscriptionTier: 'FREE' };
    nativeFlag = true;
    queryResult = { data: null, isLoading: false };

    const { container } = render(
      wrap(<TranscriptDrawer contentType="podcast" id="ep1" />),
    );
    const drawer = screen.getByTestId('transcript-drawer-mobile-free');
    expect(drawer.textContent).toContain('transcript.premium.mobile');
    expect(drawer.textContent).toContain('newshub.example');

    // Hard contract: NO clickable link to newshub.example or /pricing.
    expect(container.querySelector('a[href*="newshub.example"]')).toBeNull();
    expect(container.querySelector('a[href*="/pricing"]')).toBeNull();
    // newshub.example must be inside a <span>, not an anchor.
    const span = Array.from(container.querySelectorAll('span')).find((el) =>
      el.textContent?.includes('newshub.example'),
    );
    expect(span).toBeTruthy();
  });

  it('FREE web: renders UpgradePrompt with /pricing CTA; never mentions newshub.example', () => {
    currentUser = { subscriptionTier: 'FREE' };
    nativeFlag = false;
    queryResult = { data: null, isLoading: false };

    const { container } = render(
      wrap(<TranscriptDrawer contentType="podcast" id="ep1" />),
    );
    expect(screen.getByTestId('transcript-drawer-web-free')).toBeTruthy();
    // UpgradePrompt clicks /pricing through useNavigate, so the literal
    // href won't appear; assert the gate identifier instead.
    expect(container.textContent).not.toContain('newshub.example');
  });

  it('PREMIUM: renders segments via TranscriptSegment; clicking fires onSeek; search filters', () => {
    currentUser = { subscriptionTier: 'PREMIUM' };
    nativeFlag = false;
    queryResult = {
      data: {
        segments: [
          { startSec: 0, endSec: 5, text: 'introduction' },
          { startSec: 5, endSec: 10, text: 'cyber security' },
          { startSec: 10, endSec: 15, text: 'monetary policy' },
        ],
      },
      isLoading: false,
    };
    const onSeek = vi.fn();

    render(
      wrap(<TranscriptDrawer contentType="podcast" id="ep1" onSeek={onSeek} />),
    );

    const segments = screen.getAllByTestId('segment-stub');
    expect(segments).toHaveLength(3);

    // Click second segment → onSeek(5)
    fireEvent.click(segments[1]);
    expect(onSeek).toHaveBeenCalledWith(5);

    // Search 'monetary' filters down to 1.
    const searchInput = screen.getByPlaceholderText('transcript.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'monetary' } });
    expect(screen.getAllByTestId('segment-stub')).toHaveLength(1);
  });

  it('PREMIUM loading: renders the transcribing i18n key', () => {
    currentUser = { subscriptionTier: 'PREMIUM' };
    nativeFlag = false;
    queryResult = { data: null, isLoading: true };

    render(wrap(<TranscriptDrawer contentType="podcast" id="ep1" />));
    expect(screen.getByTestId('transcript-drawer-loading').textContent).toContain(
      'transcript.transcribing',
    );
  });

  it('PREMIUM with null data (404): renders the unavailable i18n key', () => {
    currentUser = { subscriptionTier: 'PREMIUM' };
    nativeFlag = false;
    queryResult = { data: null, isLoading: false };

    render(wrap(<TranscriptDrawer contentType="video" id="v1" />));
    expect(screen.getByTestId('transcript-drawer-empty').textContent).toContain(
      'transcript.unavailable',
    );
  });
});
