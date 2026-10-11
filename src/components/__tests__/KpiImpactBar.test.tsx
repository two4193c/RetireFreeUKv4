import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KpiImpactBar } from '../KpiImpactBar';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { TaxCalculationResult, YearProjection } from '../../types';

import { calculateUKTax } from '../../utils/ukTaxEngine';

describe('KpiImpactBar', () => {
  const mockTaxResult: TaxCalculationResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);

  const sustainableProjections: YearProjection[] = [
    {
      age: 60,
      year: 2028,
      isRetired: true,
      totalPot: 650000,
      netRetirementIncome: 30000,
      potDepleted: false,
    } as any,
  ];

  it('renders pot at retirement and sustainability when pot does not deplete', () => {
    render(
      <KpiImpactBar
        profile={{ ...DEFAULT_PROFILE, targetRetirementAge: 60 }}
        pots={DEFAULT_POTS}
        taxResult={mockTaxResult}
        projections={sustainableProjections}
        onOptimizeTaxTrap={vi.fn()}
      />
    );

    expect(screen.getByText('Pot at Age 60')).toBeInTheDocument();
    expect(screen.getByText('£650,000')).toBeInTheDocument();
    expect(screen.getByText('Sustainable (95+)')).toBeInTheDocument();
    expect(screen.getByText('Tax Model 2024/25 Active')).toBeInTheDocument();
  });

  it('displays depletion age when pot runs out early', () => {
    const depletingProjections: YearProjection[] = [
      {
        age: 60,
        year: 2028,
        isRetired: true,
        totalPot: 400000,
        netRetirementIncome: 25000,
        potDepleted: false,
      } as any,
      {
        age: 78,
        year: 2046,
        isRetired: true,
        totalPot: 0,
        netRetirementIncome: 10000,
        potDepleted: true,
      } as any,
    ];

    render(
      <KpiImpactBar
        profile={{ ...DEFAULT_PROFILE, targetRetirementAge: 60 }}
        pots={DEFAULT_POTS}
        taxResult={mockTaxResult}
        projections={depletingProjections}
        onOptimizeTaxTrap={vi.fn()}
      />
    );

    expect(screen.getByText('Depletes at Age 78')).toBeInTheDocument();
  });

  it('displays 60% tax trap alert and triggers onOptimizeTaxTrap on click', () => {
    const onOptimizeTaxTrap = vi.fn();
    const trapTaxResult: TaxCalculationResult = {
      ...mockTaxResult,
      adjustedNetIncome: 110000,
      is60PercentTaxTrap: true,
      taxTrapAmountInBracket: 10000,
      recommendedTaxTrapPensionContribution: 10000,
    };

    render(
      <KpiImpactBar
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={trapTaxResult}
        projections={sustainableProjections}
        onOptimizeTaxTrap={onOptimizeTaxTrap}
      />
    );

    expect(screen.getByText(/60% Tax Trap Active/i)).toBeInTheDocument();
    const fixNowBtn = screen.getByRole('button', { name: /Fix Now/i });
    fireEvent.click(fixNowBtn);

    expect(onOptimizeTaxTrap).toHaveBeenCalledWith(10000, 'primary');
  });

  it('handles empty projections list gracefully', () => {
    render(
      <KpiImpactBar
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        taxResult={mockTaxResult}
        projections={[]}
        onOptimizeTaxTrap={vi.fn()}
      />
    );

    expect(screen.getByText('£0')).toBeInTheDocument();
    expect(screen.getByText('Sustainable (95+)')).toBeInTheDocument();
  });
});
