import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SavePlanModal } from '../SavePlanModal';
import { DeletePlanModal } from '../DeletePlanModal';
import { ResetPresetsModal } from '../ResetPresetsModal';
import { NewPlanModal } from '../NewPlanModal';
import { PlannerScenario } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('Plan Modals', () => {
  const mockScenarios: PlannerScenario[] = [
    {
      id: 'plan-1',
      name: 'Primary Plan',
      profile: DEFAULT_PROFILE,
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-01',
    },
    {
      id: 'plan-2',
      name: 'Alternative Plan',
      profile: DEFAULT_PROFILE,
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-02',
    },
  ];

  describe('SavePlanModal', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(
        <SavePlanModal
          isOpen={false}
          onClose={vi.fn()}
          activeScenario={mockScenarios[0]}
          existingScenarios={mockScenarios}
          onOverwritePlan={vi.fn()}
          onSaveAsNewPlan={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders with active plan name and handles overwrite option', () => {
      const onClose = vi.fn();
      const onOverwritePlan = vi.fn();
      const onSaveAsNewPlan = vi.fn();

      render(
        <SavePlanModal
          isOpen={true}
          onClose={onClose}
          activeScenario={mockScenarios[0]}
          existingScenarios={mockScenarios}
          onOverwritePlan={onOverwritePlan}
          onSaveAsNewPlan={onSaveAsNewPlan}
        />
      );

      expect(screen.getByText('Save Retirement Plan')).toBeInTheDocument();
      const input = screen.getByDisplayValue('Primary Plan');
      expect(input).toBeInTheDocument();

      // Submit form with overwrite
      const submitBtn = screen.getByRole('button', { name: /Save & Overwrite/i });
      fireEvent.click(submitBtn);

      expect(onOverwritePlan).toHaveBeenCalledWith('plan-1', 'Primary Plan');
      expect(onClose).toHaveBeenCalled();
    });

    it('shows duplicate warning when typing existing plan name and supports Save as New Plan', () => {
      const onSaveAsNewPlan = vi.fn();
      const onClose = vi.fn();

      render(
        <SavePlanModal
          isOpen={true}
          onClose={onClose}
          activeScenario={mockScenarios[0]}
          existingScenarios={mockScenarios}
          onOverwritePlan={vi.fn()}
          onSaveAsNewPlan={onSaveAsNewPlan}
        />
      );

      const input = screen.getByDisplayValue('Primary Plan');
      // Change name to match plan-2
      fireEvent.change(input, { target: { value: 'Alternative Plan' } });
      expect(screen.getByText('Matching Plan Found')).toBeInTheDocument();

      // Select Save as New Plan radio
      const saveAsNewRadio = screen.getByLabelText(/Save as New Plan/i);
      fireEvent.click(saveAsNewRadio);

      const submitBtn = screen.getByRole('button', { name: /Save as New Plan/i });
      fireEvent.click(submitBtn);

      expect(onSaveAsNewPlan).toHaveBeenCalledWith('Alternative Plan');
      expect(onClose).toHaveBeenCalled();
    });

    it('closes on cancel button click', () => {
      const onClose = vi.fn();
      render(
        <SavePlanModal
          isOpen={true}
          onClose={onClose}
          activeScenario={mockScenarios[0]}
          existingScenarios={mockScenarios}
          onOverwritePlan={vi.fn()}
          onSaveAsNewPlan={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('DeletePlanModal', () => {
    it('returns null when isOpen is false or planId is null', () => {
      const { container: c1 } = render(
        <DeletePlanModal
          isOpen={false}
          onClose={vi.fn()}
          planId="plan-1"
          planName="Primary Plan"
          onConfirmDelete={vi.fn()}
        />
      );
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(
        <DeletePlanModal
          isOpen={true}
          onClose={vi.fn()}
          planId={null}
          planName="Primary Plan"
          onConfirmDelete={vi.fn()}
        />
      );
      expect(c2.firstChild).toBeNull();
    });

    it('renders confirmation text and triggers delete and close on confirm', () => {
      const onClose = vi.fn();
      const onConfirmDelete = vi.fn();

      render(
        <DeletePlanModal
          isOpen={true}
          onClose={onClose}
          planId="plan-2"
          planName="Alternative Plan"
          onConfirmDelete={onConfirmDelete}
        />
      );

      expect(screen.getByText('Remove Retirement Plan')).toBeInTheDocument();
      expect(screen.getByText(/"Alternative Plan"/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Remove Plan/i }));
      expect(onConfirmDelete).toHaveBeenCalledWith('plan-2');
      expect(onClose).toHaveBeenCalled();
    });

    it('closes on cancel click', () => {
      const onClose = vi.fn();
      render(
        <DeletePlanModal
          isOpen={true}
          onClose={onClose}
          planId="plan-2"
          planName="Alternative Plan"
          onConfirmDelete={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('ResetPresetsModal', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(
        <ResetPresetsModal
          isOpen={false}
          onClose={vi.fn()}
          onConfirmReset={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders and confirms reset', () => {
      const onClose = vi.fn();
      const onConfirmReset = vi.fn();

      render(
        <ResetPresetsModal
          isOpen={true}
          onClose={onClose}
          onConfirmReset={onConfirmReset}
        />
      );

      expect(screen.getByText('Reset to Standard Presets')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Reset All Presets/i }));

      expect(onConfirmReset).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('closes on cancel click', () => {
      const onClose = vi.fn();
      render(
        <ResetPresetsModal
          isOpen={true}
          onClose={onClose}
          onConfirmReset={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('NewPlanModal', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(
        <NewPlanModal
          isOpen={false}
          onClose={vi.fn()}
          scenarios={mockScenarios}
          activeScenarioId="plan-1"
          onCreatePlan={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders and creates a cloned plan with custom name', () => {
      const onClose = vi.fn();
      const onCreatePlan = vi.fn();

      render(
        <NewPlanModal
          isOpen={true}
          onClose={onClose}
          scenarios={mockScenarios}
          activeScenarioId="plan-1"
          onCreatePlan={onCreatePlan}
        />
      );

      expect(screen.getByText('Create New Retirement Plan')).toBeInTheDocument();
      const nameInput = screen.getByDisplayValue('Plan 3');
      fireEvent.change(nameInput, { target: { value: 'Early FIRE Plan' } });

      const submitBtn = screen.getByRole('button', { name: /Create Plan/i });
      fireEvent.click(submitBtn);

      expect(onCreatePlan).toHaveBeenCalledWith('clone', 'plan-1', 'Early FIRE Plan');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
