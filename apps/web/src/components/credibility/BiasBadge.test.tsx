/**
 * Unit tests for BiasBadge component.
 *
 * Verifies the D-04 LOCKED political-bias bucketing thresholds:
 *   politicalBias < -0.2  → 'left'   (text-blue-400)
 *   -0.2 <= bias <= 0.2   → 'center' (text-gray-400)
 *   politicalBias >  0.2  → 'right'  (text-red-400)
 *
 * Boundary cases at ±0.2 must fall into 'center' (strict-less-than / strict-greater-than).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BiasBadge } from './BiasBadge';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('BiasBadge', () => {
  it('renders left bucket with blue color when politicalBias < -0.2', () => {
    const { container } = render(<BiasBadge politicalBias={-0.5} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-blue-400');
    expect(span?.textContent).toContain('bias.left');
  });

  it('renders center bucket exactly at the lower boundary -0.2', () => {
    const { container } = render(<BiasBadge politicalBias={-0.2} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-gray-400');
    expect(span?.textContent).toContain('bias.center');
  });

  it('renders left bucket just below boundary at -0.21', () => {
    const { container } = render(<BiasBadge politicalBias={-0.21} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-blue-400');
  });

  it('renders center bucket when politicalBias is 0', () => {
    const { container } = render(<BiasBadge politicalBias={0} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-gray-400');
    expect(span?.textContent).toContain('bias.center');
  });

  it('renders center bucket exactly at the upper boundary 0.2', () => {
    const { container } = render(<BiasBadge politicalBias={0.2} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-gray-400');
    expect(span?.textContent).toContain('bias.center');
  });

  it('renders right bucket just above boundary at 0.21', () => {
    const { container } = render(<BiasBadge politicalBias={0.21} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-red-400');
  });

  it('renders right bucket with red color when politicalBias > 0.2', () => {
    const { container } = render(<BiasBadge politicalBias={0.5} />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('text-red-400');
    expect(span?.textContent).toContain('bias.right');
  });

  it('forwards a custom className', () => {
    const { container } = render(<BiasBadge politicalBias={0} className="extra-cls" />);
    expect(container.firstChild).toHaveClass('extra-cls');
  });
});
