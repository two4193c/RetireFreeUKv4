import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';
import { PlannerScenario } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('Header', () => {
  const mockScenarios: PlannerScenario[] = [
    {
      id: 'plan-1',
      name: 'Early FIRE Plan',
      updatedAt: '2026-01-01',
      profile: { ...DEFAULT_PROFILE, targetRetirementAge: 55 },
      pots: DEFAULT_POTS,
    },
    {
      id: 'plan-2',
      name: 'Traditional 65 Plan',
      updatedAt: '2026-01-02',
      profile: { ...DEFAULT_PROFILE, targetRetirementAge: 65 },
      pots: DEFAULT_POTS,
    },
  ];

  it('renders the active scenario name and opens the dropdown', () => {
    render(
      <Header
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
      />
    );

    expect(screen.getByText('Early FIRE Plan')).toBeInTheDocument();
    expect(screen.getByText('Active Plan')).toBeInTheDocument();

    // Dropdown initially closed
    expect(screen.queryByText(/Switch Active Plan/i)).not.toBeInTheDocument();

    // Click trigger button to open
    const planTrigger = screen.getByRole('button', { name: /Active Plan/i });
    fireEvent.click(planTrigger);

    expect(screen.getByText(/Switch Active Plan \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText('Traditional 65 Plan')).toBeInTheDocument();
  });

  it('triggers onSelectScenario when selecting another scenario from dropdown', () => {
    const onSelectScenario = vi.fn();
    render(
      <Header
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={onSelectScenario}
      />
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Active Plan/i }));

    // Select plan 2
    const plan2Button = screen.getByRole('button', { name: /Traditional 65 Plan/i });
    fireEvent.click(plan2Button);

    expect(onSelectScenario).toHaveBeenCalledWith('plan-2');
    // Dropdown should close
    expect(screen.queryByText(/Switch Active Plan/i)).not.toBeInTheDocument();
  });

  it('triggers quick save and new plan actions', () => {
    const onSaveScenario = vi.fn();
    const onNewScenario = vi.fn();

    render(
      <Header
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSaveScenario={onSaveScenario}
        onNewScenario={onNewScenario}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Save active plan/i });
    fireEvent.click(saveBtn);
    expect(onSaveScenario).toHaveBeenCalledTimes(1);

    const newBtn = screen.getByRole('button', { name: /Create new plan/i });
    fireEvent.click(newBtn);
    expect(onNewScenario).toHaveBeenCalledTimes(1);
  });

  it('triggers Manage All and Create New Plan from inside the dropdown', () => {
    const onOpenManagePlans = vi.fn();
    const onNewScenario = vi.fn();

    render(
      <Header
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onOpenManagePlans={onOpenManagePlans}
        onNewScenario={onNewScenario}
      />
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Active Plan/i }));

    // Manage all
    const manageBtn = screen.getByRole('button', { name: /Manage All/i });
    fireEvent.click(manageBtn);
    expect(onOpenManagePlans).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Switch Active Plan/i)).not.toBeInTheDocument();

    // Reopen dropdown and click Create New Plan (the one inside dropdown footer)
    fireEvent.click(screen.getByRole('button', { name: /Active Plan/i }));
    const createNewBtns = screen.getAllByRole('button', { name: /Create New Plan/i });
    fireEvent.click(createNewBtns[1]);
    expect(onNewScenario).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Switch Active Plan/i)).not.toBeInTheDocument();
  });

  it('closes dropdown on click outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside Element</div>
        <Header
          scenarios={mockScenarios}
          activeScenarioId="plan-1"
        />
      </div>
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Active Plan/i }));
    expect(screen.getByText(/Switch Active Plan/i)).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText(/Switch Active Plan/i)).not.toBeInTheDocument();
  });
});
