import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CompareModal } from '../CompareModal';
import { PlannerScenario } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('CompareModal', () => {
  const mockScenarios: PlannerScenario[] = [
    {
      id: 'plan-1',
      name: 'Baseline Plan',
      profile: DEFAULT_PROFILE,
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-01',
    },
    {
      id: 'plan-2',
      name: 'Accelerated FIRE Plan',
      profile: {
        ...DEFAULT_PROFILE,
        targetRetirementAge: 55,
      },
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-02',
    },
  ];

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <CompareModal
        isOpen={false}
        onClose={vi.fn()}
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog with header, scenario comparer, and closes on Escape or close button', () => {
    const onClose = vi.fn();

    render(
      <CompareModal
        isOpen={true}
        onClose={onClose}
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        scenarioAId="plan-1"
        scenarioBId="plan-2"
        onSelectScenarioA={vi.fn()}
        onSelectScenarioB={vi.fn()}
      />
    );

    expect(screen.getByText('Scenario Comparison & Strategy Scorecard')).toBeInTheDocument();
    expect(screen.getByText('Studio Pop-Out')).toBeInTheDocument();

    // Close button
    const closeBtns = screen.getAllByRole('button', { name: 'Close' });
    expect(closeBtns.length).toBeGreaterThan(0);
    fireEvent.click(closeBtns[0]);
    expect(onClose).toHaveBeenCalled();

    // Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();

    render(
      <CompareModal
        isOpen={true}
        onClose={onClose}
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
