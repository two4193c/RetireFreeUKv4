import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DuplicateVariantConflictModal, ConflictPlanInfo } from '../DuplicateVariantConflictModal';

describe('DuplicateVariantConflictModal', () => {
  const mockConflicts: ConflictPlanInfo[] = [
    { existingScenarioId: 'plan-1', planName: 'Base Plan (UFPLS)' },
    { existingScenarioId: 'plan-2', planName: 'Base Plan (ISA First)' },
  ];

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <DuplicateVariantConflictModal
        isOpen={false}
        onClose={vi.fn()}
        basePlanName="Base Plan"
        conflictingPlans={mockConflicts}
        allProposedVariantNames={['Base Plan (UFPLS)', 'Base Plan (ISA First)']}
        onReplaceExisting={vi.fn()}
        onCreateWithNewBaseName={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders conflicting plans list and executes replace existing option', () => {
    const onReplaceExisting = vi.fn();
    const onClose = vi.fn();

    render(
      <DuplicateVariantConflictModal
        isOpen={true}
        onClose={onClose}
        basePlanName="Base Plan"
        conflictingPlans={mockConflicts}
        allProposedVariantNames={['Base Plan (UFPLS)', 'Base Plan (ISA First)']}
        onReplaceExisting={onReplaceExisting}
        onCreateWithNewBaseName={vi.fn()}
      />
    );

    expect(screen.getByText('Duplicate Strategy Plans Found')).toBeInTheDocument();
    expect(screen.getByText(/Base Plan \(UFPLS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Base Plan \(ISA First\)/i)).toBeInTheDocument();

    // Default selection is Replace Existing Plans
    const submitBtn = screen.getByRole('button', { name: /Confirm & Proceed/i });
    fireEvent.click(submitBtn);

    expect(onReplaceExisting).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports selecting new base name option and submitting custom prefix', () => {
    const onCreateWithNewBaseName = vi.fn();
    const onClose = vi.fn();

    render(
      <DuplicateVariantConflictModal
        isOpen={true}
        onClose={onClose}
        basePlanName="Retirement 2026"
        conflictingPlans={mockConflicts}
        allProposedVariantNames={['Retirement 2026 (UFPLS)']}
        onReplaceExisting={vi.fn()}
        onCreateWithNewBaseName={onCreateWithNewBaseName}
      />
    );

    // Switch to Option B (Create New Suite with Custom Base Name)
    const newNameRadio = screen.getByRole('radio', { name: /Create New Suite with Custom Base Name/i });
    fireEvent.click(newNameRadio);

    const input = screen.getByDisplayValue('Retirement 2026 Copy');
    fireEvent.change(input, { target: { value: 'Retirement 2026 V3' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Proceed/i });
    fireEvent.click(submitBtn);

    expect(onCreateWithNewBaseName).toHaveBeenCalledWith('Retirement 2026 V3');
    expect(onClose).toHaveBeenCalled();
  });

  it('handles cancel and close buttons', () => {
    const onClose = vi.fn();

    render(
      <DuplicateVariantConflictModal
        isOpen={true}
        onClose={onClose}
        basePlanName="Base Plan"
        conflictingPlans={mockConflicts}
        allProposedVariantNames={['Base Plan (UFPLS)']}
        onReplaceExisting={vi.fn()}
        onCreateWithNewBaseName={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
