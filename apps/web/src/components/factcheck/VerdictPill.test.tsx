/**
 * Unit tests for VerdictPill component.
 *
 * Verifies the D-08 LOCKED verdict color mapping:
 *   true        → #00ff88 (green)
 *   mostly-true → #84cc16 (lime)
 *   mixed       → #ffee00 (yellow)
 *   unverified  → gray
 *   false       → #ff0044 (red)
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { VerdictPill } from './VerdictPill';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('VerdictPill', () => {
  it('renders true with green #00ff88 class', () => {
    const { container } = render(<VerdictPill verdict="true" />);
    expect((container.firstChild as Element).className).toContain('#00ff88');
  });

  it('renders mostly-true with lime #84cc16 class', () => {
    const { container } = render(<VerdictPill verdict="mostly-true" />);
    expect((container.firstChild as Element).className).toContain('#84cc16');
  });

  it('renders mixed with yellow #ffee00 class', () => {
    const { container } = render(<VerdictPill verdict="mixed" />);
    expect((container.firstChild as Element).className).toContain('#ffee00');
  });

  it('renders unverified with gray class', () => {
    const { container } = render(<VerdictPill verdict="unverified" />);
    expect((container.firstChild as Element).className).toContain('gray');
  });

  it('renders false with red #ff0044 class', () => {
    const { container } = render(<VerdictPill verdict="false" />);
    expect((container.firstChild as Element).className).toContain('#ff0044');
  });

  it('uses the localized verdict key from the factcheck namespace', () => {
    const { container } = render(<VerdictPill verdict="mostly-true" />);
    // Mock returns the key as text — verifies the t('verdicts.<verdict>') path.
    expect(container.firstChild?.textContent).toContain('verdicts.mostly-true');
  });

  it('forwards a custom className', () => {
    const { container } = render(<VerdictPill verdict="mixed" className="extra-cls" />);
    expect(container.firstChild).toHaveClass('extra-cls');
  });
});
