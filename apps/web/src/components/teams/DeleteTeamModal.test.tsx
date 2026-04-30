/**
 * Unit tests for DeleteTeamModal component.
 *
 * Proves the delete confirmation gate:
 * - Returns null when isOpen is false
 * - Renders with teamName visible when isOpen is true
 * - Delete button disabled until exact teamName typed
 * - Delete button enabled once exact teamName typed
 * - useDeleteTeam.mutate called with teamId when enabled button clicked
 * - onSuccess triggers navigate('/') and onClose
 * - Input resets when modal is re-opened
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { DeleteTeamModal } from './DeleteTeamModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) =>
      typeof opts === 'string'
        ? opts
        : (opts as { defaultValue?: string })?.defaultValue ?? key,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockDeleteTeam = vi.fn();
vi.mock('../../hooks/useTeams', () => ({
  useDeleteTeam: () => ({ mutate: mockDeleteTeam, isPending: false }),
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  teamId: 'team-id-1',
  teamName: 'Alpha Squad',
};

describe('DeleteTeamModal', () => {
  beforeEach(() => {
    mockDeleteTeam.mockClear();
    mockNavigate.mockClear();
    defaultProps.onClose = vi.fn();
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <DeleteTeamModal {...defaultProps} isOpen={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the modal with teamName visible when isOpen is true', () => {
    const { container } = render(
      <DeleteTeamModal {...defaultProps} />
    );

    expect(container.textContent).toContain('Alpha Squad');
  });

  it('delete button is disabled when input is wrong', () => {
    const { container } = render(
      <DeleteTeamModal {...defaultProps} />
    );

    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: 'wrong name' } });

    // Last button is the delete button (Cancel + Delete layout)
    const buttons = container.querySelectorAll('button');
    const deleteBtn = buttons[buttons.length - 1];
    expect(deleteBtn).toHaveProperty('disabled', true);
  });

  it('delete button becomes enabled when exact teamName is typed', () => {
    const { container } = render(
      <DeleteTeamModal {...defaultProps} />
    );

    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: 'Alpha Squad' } });

    const buttons = container.querySelectorAll('button');
    const deleteBtn = buttons[buttons.length - 1];
    expect(deleteBtn).toHaveProperty('disabled', false);
  });

  it('calls useDeleteTeam.mutate with teamId when enabled delete button clicked', () => {
    const { container } = render(
      <DeleteTeamModal {...defaultProps} />
    );

    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: 'Alpha Squad' } });

    const buttons = container.querySelectorAll('button');
    const deleteBtn = buttons[buttons.length - 1];
    fireEvent.click(deleteBtn);

    expect(mockDeleteTeam).toHaveBeenCalledWith(
      'team-id-1',
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it('calls navigate("/") and onClose when onSuccess callback is invoked', () => {
    const onCloseMock = vi.fn();
    const { container } = render(
      <DeleteTeamModal {...defaultProps} onClose={onCloseMock} />
    );

    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: 'Alpha Squad' } });

    const buttons = container.querySelectorAll('button');
    const deleteBtn = buttons[buttons.length - 1];
    fireEvent.click(deleteBtn);

    expect(mockDeleteTeam).toHaveBeenCalledWith('team-id-1', expect.any(Object));

    // Extract and invoke the onSuccess callback
    const callArgs = mockDeleteTeam.mock.calls[0];
    const opts = callArgs[1];
    act(() => opts.onSuccess());

    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('resets input to empty when modal re-opens', () => {
    const { container, rerender } = render(
      <DeleteTeamModal {...defaultProps} isOpen={true} />
    );

    // Type something
    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: 'Alpha Squad' } });
    expect((input as HTMLInputElement).value).toBe('Alpha Squad');

    // Close modal (triggers useEffect reset)
    rerender(<DeleteTeamModal {...defaultProps} isOpen={false} />);

    // Re-open
    rerender(<DeleteTeamModal {...defaultProps} isOpen={true} />);

    const inputAfterReopen = container.querySelector('input[type="text"]')!;
    expect((inputAfterReopen as HTMLInputElement).value).toBe('');
  });
});
