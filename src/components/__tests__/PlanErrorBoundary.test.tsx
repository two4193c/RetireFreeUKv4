import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlanErrorBoundary } from '../PlanErrorBoundary';
import { PlannerScenario } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

const ProblemChild: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Simulation failed due to corrupt input');
  }
  return <div>Normal Plan Content</div>;
};

describe('PlanErrorBoundary', () => {
  const mockScenario: PlannerScenario = {
    id: 'plan-xyz',
    name: 'My Special Plan',
    profile: DEFAULT_PROFILE,
    pots: DEFAULT_POTS,
    updatedAt: '2026-01-01',
  };

  it('renders children when no error occurs', () => {
    render(
      <PlanErrorBoundary
        activeScenario={mockScenario}
        onDeleteScenario={vi.fn()}
      >
        <ProblemChild shouldThrow={false} />
      </PlanErrorBoundary>
    );

    expect(screen.getByText('Normal Plan Content')).toBeInTheDocument();
  });

  it('catches thrown error and displays fallback UI with error details and actions', () => {
    // Suppress console.error in test output for intentional throw
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const onDeleteScenario = vi.fn();
    const onResetPlanData = vi.fn();

    render(
      <PlanErrorBoundary
        activeScenario={mockScenario}
        onDeleteScenario={onDeleteScenario}
        onResetPlanData={onResetPlanData}
      >
        <ProblemChild shouldThrow={true} />
      </PlanErrorBoundary>
    );

    expect(screen.getByText('Plan Could Not Be Loaded')).toBeInTheDocument();
    expect(screen.getByText(/"My Special Plan"/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulation failed due to corrupt input/i)).toBeInTheDocument();

    // Reset plan
    const resetBtn = screen.getByRole('button', { name: /Reset Plan to Defaults/i });
    fireEvent.click(resetBtn);
    expect(onResetPlanData).toHaveBeenCalledWith('plan-xyz');

    // Remove plan
    const removeBtn = screen.getByRole('button', { name: /Remove This Plan/i });
    fireEvent.click(removeBtn);
    expect(onDeleteScenario).toHaveBeenCalledWith('plan-xyz');

    consoleErrorSpy.mockRestore();
  });

  it('clears error state when switching activeScenario id', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <PlanErrorBoundary
        activeScenario={mockScenario}
        onDeleteScenario={vi.fn()}
      >
        <ProblemChild shouldThrow={true} />
      </PlanErrorBoundary>
    );

    expect(screen.getByText('Plan Could Not Be Loaded')).toBeInTheDocument();

    // Rerender with a different activeScenario and a working child
    const newScenario: PlannerScenario = {
      id: 'plan-abc',
      name: 'Alternative Plan',
      profile: DEFAULT_PROFILE,
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-02',
    };

    rerender(
      <PlanErrorBoundary
        activeScenario={newScenario}
        onDeleteScenario={vi.fn()}
      >
        <ProblemChild shouldThrow={false} />
      </PlanErrorBoundary>
    );

    expect(screen.getByText('Normal Plan Content')).toBeInTheDocument();
    expect(screen.queryByText('Plan Could Not Be Loaded')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('allows retry loading button click', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PlanErrorBoundary
        activeScenario={mockScenario}
        onDeleteScenario={vi.fn()}
      >
        <ProblemChild shouldThrow={true} />
      </PlanErrorBoundary>
    );

    const retryBtn = screen.getByRole('button', { name: /Retry Loading/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);

    consoleErrorSpy.mockRestore();
  });
});
