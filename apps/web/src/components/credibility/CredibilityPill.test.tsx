/**
 * Unit tests for CredibilityPill component.
 *
 * Verifies:
 * - 0-100 score color thresholds (>=70 cyan, 40-69 yellow, <40 red).
 * - Confidence sub-pill rendering presence/absence.
 * - Confidence color buckets (high cyan / medium yellow / low gray).
 *
 * D-04 / D-05 LOCKED — boundary values must match the documented thresholds verbatim.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CredibilityPill } from './CredibilityPill';

// Mock react-i18next so t(key) returns the key — keeps tests deterministic without the i18n stack.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CredibilityPill', () => {
  describe('score color thresholds', () => {
    it('uses cyan classes when score >= 70', () => {
      const { container } = render(<CredibilityPill score={70} />);
      const scorePill = container.querySelector('span span');
      expect(scorePill?.className).toContain('#00f0ff');
    });

    it('uses yellow classes for score in [40, 69]', () => {
      const { container } = render(<CredibilityPill score={69} />);
      const scorePill = container.querySelector('span span');
      expect(scorePill?.className).toContain('#ffee00');
    });

    it('uses yellow classes at the 40 boundary', () => {
      const { container } = render(<CredibilityPill score={40} />);
      const scorePill = container.querySelector('span span');
      expect(scorePill?.className).toContain('#ffee00');
    });

    it('uses red classes for score < 40', () => {
      const { container } = render(<CredibilityPill score={39} />);
      const scorePill = container.querySelector('span span');
      expect(scorePill?.className).toContain('#ff0044');
    });
  });

  describe('rendered score value', () => {
    it('rounds the score and renders it', () => {
      render(<CredibilityPill score={73.7} />);
      // Match the rounded number anywhere inside the pill content.
      expect(screen.getByText(/74/)).toBeInTheDocument();
    });
  });

  describe('confidence sub-pill', () => {
    it('does not render a sub-pill when confidence is undefined', () => {
      const { container } = render(<CredibilityPill score={50} />);
      // Outer wrapper has 1 inner span (the score pill) and no second sub-pill.
      const subSpans = container.querySelectorAll('span > span');
      expect(subSpans.length).toBe(1);
    });

    it('renders a confidence sub-pill with cyan classes when high', () => {
      const { container } = render(<CredibilityPill score={50} confidence="high" />);
      const subSpans = container.querySelectorAll('span > span');
      expect(subSpans.length).toBe(2);
      expect(subSpans[1].className).toContain('#00f0ff');
    });

    it('renders a confidence sub-pill with yellow classes when medium', () => {
      const { container } = render(<CredibilityPill score={50} confidence="medium" />);
      const subSpans = container.querySelectorAll('span > span');
      expect(subSpans[1].className).toContain('#ffee00');
    });

    it('renders a confidence sub-pill with gray classes when low', () => {
      const { container } = render(<CredibilityPill score={50} confidence="low" />);
      const subSpans = container.querySelectorAll('span > span');
      expect(subSpans[1].className).toContain('gray');
    });
  });

  it('forwards a custom className to the wrapper', () => {
    const { container } = render(<CredibilityPill score={50} className="my-test-class" />);
    expect(container.firstChild).toHaveClass('my-test-class');
  });
});
