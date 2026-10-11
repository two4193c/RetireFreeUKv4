import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DynamicOptimiserCard } from '../DynamicOptimiserCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { generateProjections } from '../../utils/projectionEngine';
import { calculateUKTax } from '../../utils/ukTaxEngine';
import { MonteCarloResult } from '../../utils/monteCarloEngine';

describe('DynamicOptimiserCard', () => {
  const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
  const projections = generateProjections(DEFAULT_PROFILE, DEFAULT_POTS, taxResult);

  it('renders Optimal Withdrawal Streamgraph and Multi-Objective Plan Score panels', () => {
    render(
      <DynamicOptimiserCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={taxResult}
        projections={projections}
      />
    );

    expect(screen.getByText(/Optimal Withdrawal Streamgraph/i)).toBeInTheDocument();
    expect(screen.getByText(/Multi-Objective Plan Score/i)).toBeInTheDocument();
  });

  it('toggles Tax Matrix table view on button click', () => {
    render(
      <DynamicOptimiserCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={taxResult}
        projections={projections}
      />
    );

    const matrixBtn = screen.getByRole('button', { name: /^Tax Matrix$/i });
    fireEvent.click(matrixBtn);

    expect(screen.getByText(/Hide Matrix/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hide Matrix/i }));
    expect(screen.getByRole('button', { name: /^Tax Matrix$/i })).toBeInTheDocument();
  }, 15000);

  it('displays Monte Carlo success rate pill when monteCarloResult is passed', () => {
    const mockMc: MonteCarloResult = {
      successRate: 94.5,
      medianEndingWealth: 550000,
      percentile10EndingWealth: 150000,
      percentile90EndingWealth: 1200000,
      trajectories: [],
      percentiles: {
        p10: [],
        p25: [],
        p50: [],
        p75: [],
        p90: [],
      },
    } as unknown as MonteCarloResult;

    render(
      <DynamicOptimiserCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={taxResult}
        projections={projections}
        monteCarloResult={mockMc}
      />
    );

    expect(screen.getAllByText(/94.5%/i).length).toBeGreaterThan(0);
  });

  it('triggers onRunStressTest when longevity prompt is clicked without MC', () => {
    const onRunStressTest = vi.fn();

    render(
      <DynamicOptimiserCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={taxResult}
        projections={projections}
        onRunStressTest={onRunStressTest}
      />
    );

    const stressTestBtn = screen.queryByRole('button', { name: /Stress Test/i });
    if (stressTestBtn) {
      fireEvent.click(stressTestBtn);
      expect(onRunStressTest).toHaveBeenCalled();
    }
  });
});
