import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScenarioComparer } from '../ScenarioComparer';
import { PlannerScenario } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('ScenarioComparer', () => {
  const mockScenarios: PlannerScenario[] = [
    {
      id: 'scen-1',
      name: 'Alpha Conservative Plan',
      profile: {
        ...DEFAULT_PROFILE,
        targetRetirementAge: 65,
        targetRetirementIncomeAnnual: 30000,
      },
      pots: {
        ...DEFAULT_POTS,
        workplacePensionBalance: 400000,
        stocksAndSharesIsaBalance: 100000,
        cashSavingsBalance: 40000,
      },
      updatedAt: '2026-01-01T10:00:00Z',
    },
    {
      id: 'scen-2',
      name: 'Beta Aggressive Plan',
      profile: {
        ...DEFAULT_PROFILE,
        targetRetirementAge: 58,
        targetRetirementIncomeAnnual: 45000,
      },
      pots: {
        ...DEFAULT_POTS,
        workplacePensionBalance: 600000,
        stocksAndSharesIsaBalance: 250000,
        cashSavingsBalance: 60000,
      },
      updatedAt: '2026-01-02T10:00:00Z',
    },
    {
      id: 'scen-3',
      name: 'Gamma Balanced Plan',
      profile: {
        ...DEFAULT_PROFILE,
        targetRetirementAge: 60,
        targetRetirementIncomeAnnual: 35000,
      },
      pots: {
        ...DEFAULT_POTS,
        workplacePensionBalance: 500000,
        stocksAndSharesIsaBalance: 150000,
        cashSavingsBalance: 50000,
      },
      updatedAt: '2026-01-03T10:00:00Z',
    },
  ];

  it('renders scenario comparison header, selectors, and executive winner takeaway', () => {
    const onClose = vi.fn();
    render(
      <ScenarioComparer
        scenarios={mockScenarios}
        activeScenarioId="scen-1"
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Side-by-Side Strategy & Product Comparer/i)).toBeInTheDocument();
    expect(screen.getByText(/Executive Benchmark Takeaway/i)).toBeInTheDocument();
    expect(screen.getByText(/Scenario A \(Baseline Plan\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Scenario B \(Comparison Plan\):/i)).toBeInTheDocument();

    // Close button
    const closeBtns = screen.getAllByRole('button');
    const closeXBtn = closeBtns.find((b) => b.querySelector('svg.lucide-x'));
    expect(closeXBtn).toBeDefined();
    if (closeXBtn) {
      fireEvent.click(closeXBtn);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('allows swapping Scenario A and Scenario B', () => {
    const onSelectScenarioA = vi.fn();
    const onSelectScenarioB = vi.fn();

    render(
      <ScenarioComparer
        scenarios={mockScenarios}
        activeScenarioId="scen-1"
        scenarioAId="scen-1"
        scenarioBId="scen-2"
        onSelectScenarioA={onSelectScenarioA}
        onSelectScenarioB={onSelectScenarioB}
        onClose={vi.fn()}
      />
    );

    const swapBtn = screen.getByRole('button', { name: /Swap A ↔ B/i });
    fireEvent.click(swapBtn);

    expect(onSelectScenarioA).toHaveBeenCalledWith('scen-2');
    expect(onSelectScenarioB).toHaveBeenCalledWith('scen-1');
  });

  it('allows adding and removing a 3rd scenario (Scenario C)', () => {
    render(
      <ScenarioComparer
        scenarios={mockScenarios}
        activeScenarioId="scen-1"
        onClose={vi.fn()}
      />
    );

    const add3rdBtn = screen.getByRole('button', { name: /\+ Add 3rd Scenario/i });
    fireEvent.click(add3rdBtn);

    expect(screen.getByText(/Scenario C \(3rd Option\):/i)).toBeInTheDocument();

    const remove3rdBtn = screen.getByRole('button', { name: /Remove 3rd Scenario/i });
    fireEvent.click(remove3rdBtn);

    expect(screen.queryByText(/Scenario C \(3rd Option\):/i)).not.toBeInTheDocument();
  });

  it('allows toggling between Real Today £ and Future Nominal £', () => {
    render(
      <ScenarioComparer
        scenarios={mockScenarios}
        activeScenarioId="scen-1"
        onClose={vi.fn()}
      />
    );

    const toggleRealBtn = screen.getByRole('button', { name: /Future Nominal £|Today’s Real £/i });
    expect(toggleRealBtn).toBeInTheDocument();
    fireEvent.click(toggleRealBtn);

    expect(screen.getByRole('button', { name: /Today’s Real £/i })).toBeInTheDocument();
  });

  it('switches chart metrics between wealth, income, tax, and guaranteed floor', () => {
    render(
      <ScenarioComparer
        scenarios={mockScenarios}
        activeScenarioId="scen-1"
        onClose={vi.fn()}
      />
    );

    const incomeMetricBtn = screen.getByRole('button', { name: /Net Income/i });
    fireEvent.click(incomeMetricBtn);

    const taxMetricBtn = screen.getByRole('button', { name: /Tax Paid/i });
    fireEvent.click(taxMetricBtn);

    const guaranteedFloorBtn = screen.getByRole('button', { name: /Guaranteed Floor/i });
    fireEvent.click(guaranteedFloorBtn);
  });

  it('exports comparison data to CSV', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-csv-url');
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    render(
      <ScenarioComparer
        scenarios={mockScenarios}
        activeScenarioId="scen-1"
        onClose={vi.fn()}
      />
    );

    const exportCsvBtn = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportCsvBtn);

    expect(createObjectURL).toHaveBeenCalled();
  });
});
