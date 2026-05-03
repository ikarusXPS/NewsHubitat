import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { TeamSettingsModal } from './TeamSettingsModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: string | Record<string, unknown>) =>
      typeof opts === 'string' ? opts : (opts as Record<string, unknown>)?.defaultValue as string ?? key,
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockUpdateTeam = vi.fn();
vi.mock('../../hooks/useTeams', () => ({
  useUpdateTeam: () => ({ mutate: mockUpdateTeam, isPending: false }),
}));

describe('TeamSettingsModal', () => {
  beforeEach(() => {
    mockUpdateTeam.mockClear();
    cleanup();
  });

  it('Test 1: returns null when isOpen is false', () => {
    const { container } = render(
      <TeamSettingsModal
        isOpen={false}
        onClose={vi.fn()}
        teamId="team-1"
        currentName="My Team"
        currentDescription={null}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('Test 2: renders modal with currentName visible and name input pre-filled when isOpen is true', () => {
    const { container } = render(
      <TeamSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        teamId="team-1"
        currentName="My Team"
        currentDescription="A great team"
      />
    );
    const nameInput = container.querySelector('input#team-settings-name') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe('My Team');
    // currentName visible somewhere in the modal
    expect(container.textContent).toContain('My Team');
  });

  it('Test 3: description textarea is empty string when currentDescription is null', () => {
    const { container } = render(
      <TeamSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        teamId="team-1"
        currentName="My Team"
        currentDescription={null}
      />
    );
    const descInput = container.querySelector('textarea#team-settings-description') as HTMLTextAreaElement;
    expect(descInput).not.toBeNull();
    expect(descInput.value).toBe('');
  });

  it('Test 4: submit button is disabled when user clears name input (length 0)', () => {
    const { container } = render(
      <TeamSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        teamId="team-1"
        currentName="My Team"
        currentDescription={null}
      />
    );
    const nameInput = container.querySelector('input#team-settings-name')!;
    fireEvent.change(nameInput, { target: { value: '' } });
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('Test 5: submit button is disabled when user types a name shorter than 3 chars', () => {
    const { container } = render(
      <TeamSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        teamId="team-1"
        currentName="My Team"
        currentDescription={null}
      />
    );
    const nameInput = container.querySelector('input#team-settings-name')!;
    fireEvent.change(nameInput, { target: { value: 'AB' } });
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('Test 6: calls useUpdateTeam.mutate with { name, description: null } when valid name change submitted', () => {
    const onClose = vi.fn();
    const { container } = render(
      <TeamSettingsModal
        isOpen={true}
        onClose={onClose}
        teamId="team-1"
        currentName="Old Name"
        currentDescription={null}
      />
    );
    const nameInput = container.querySelector('input#team-settings-name')!;
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    const submitBtn = container.querySelector('button[type="submit"]')!;
    fireEvent.click(submitBtn);
    expect(mockUpdateTeam).toHaveBeenCalledWith(
      { name: 'New Name', description: null },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it('Test 7: calls onClose after successful mutation', () => {
    const onClose = vi.fn();
    const { container } = render(
      <TeamSettingsModal
        isOpen={true}
        onClose={onClose}
        teamId="team-1"
        currentName="Old Name"
        currentDescription={null}
      />
    );
    const nameInput = container.querySelector('input#team-settings-name')!;
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    const submitBtn = container.querySelector('button[type="submit"]')!;
    fireEvent.click(submitBtn);
    const opts = mockUpdateTeam.mock.calls[0][1];
    act(() => opts.onSuccess());
    expect(onClose).toHaveBeenCalled();
  });

  it('Test 8: submit button is disabled when name and description are unchanged (no-op edit prevention)', () => {
    const { container } = render(
      <TeamSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        teamId="team-1"
        currentName="My Team"
        currentDescription="Some description"
      />
    );
    // No changes made — values are same as current
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });
});
