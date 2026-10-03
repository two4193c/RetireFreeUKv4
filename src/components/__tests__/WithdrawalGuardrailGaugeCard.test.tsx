import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WithdrawalGuardrailGaugeCard } from '../WithdrawalGuardrailGaugeCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { YearProjection } from '../../types';

describe('WithdrawalGuardrailGaugeCard', () => {
  it('renders the guardrail gauge with corridor metrics and status', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 35000,
    };

    const pots = {
      ...DEFAULT_POTS,
      sippBalance: 700000,
      stocksAndSharesIsaBalance: 150000,
    };

    render(
      <WithdrawalGuardrailGaugeCard
        profile={profile}
        pots={pots}
        horizonYears={30}
      />
    );

    expect(screen.getByText(/Dynamic Guardrail Threshold Gauge \(Guyton-Klinger\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Initial SWR/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prosperity Rule/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Capital Preservation Rule/i).length).toBeGreaterThan(0);
  });

  it('correctly calculates initial SWR consistently in both nominal and real terms when projections are provided', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 40000,
      expectedInflationRate: 2.5,
      adjustForInflation: false, // Nominal mode
    };

    const pots = {
      ...DEFAULT_POTS,
      sippBalance: 200000,
    };

    const inflFactor = Math.pow(1.025, 20); // ~1.6386
    const nominalRetirementPot = 1000000;
    const nominalWithdrawal = 30000 * inflFactor;

    const projections: YearProjection[] = [
      {
        age: 60,
        isRetired: true,
        totalPot: nominalRetirementPot - nominalWithdrawal,
        totalWithdrawalAmount: nominalWithdrawal,
        targetRetirementIncome: 40000 * inflFactor,
        statePensionReceived: 10000 * inflFactor,
        dbPensionIncomeReceived: 0,
        annuityIncomeReceived: 0,
        taxableFixedIncomeReceived: 0,
        taxFreeFixedIncomeReceived: 0,
        year: 2046,
      } as unknown as YearProjection,
    ];

    const { rerender } = render(
      <WithdrawalGuardrailGaugeCard
        profile={profile}
        pots={pots}
        projections={projections}
      />
    );

    // Initial SWR in nominal mode should be (30000 * inflFactor) / (1000000) * 100
    // SWR ratio: ~4.9%
    const nominalSwrText = screen.getByText(/Initial Withdrawal Rate/i).closest('div')?.textContent;
    expect(nominalSwrText).toBeDefined();

    // Rerender in real mode (adjustForInflation: true)
    rerender(
      <WithdrawalGuardrailGaugeCard
        profile={{ ...profile, adjustForInflation: true }}
        pots={pots}
        projections={projections}
      />
    );

    const realSwrText = screen.getByText(/Initial Withdrawal Rate/i).closest('div')?.textContent;
    // SWR percentage must match across real and nominal modes
    expect(realSwrText).toEqual(nominalSwrText);
  });

  it('updates guardrail triggers and cut/raise percentages based on dynamicSpendingRules inputs', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 40000,
      dynamicSpendingRules: {
        enabled: true,
        capitalPreservationThresholdPercent: 30,
        capitalPreservationCutPercent: 15,
        prosperityThresholdPercent: 15,
        prosperityIncreasePercent: 12,
        skipInflationOnNegativeReturn: true,
      },
    };

    const pots = {
      ...DEFAULT_POTS,
      sippBalance: 1000000,
    };

    render(
      <WithdrawalGuardrailGaugeCard
        profile={profile}
        pots={pots}
        horizonYears={30}
      />
    );

    expect(screen.getByText(/\+30% \/ -15% corridor/i)).toBeInTheDocument();
    expect(screen.getAllByText(/15%/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12%/i).length).toBeGreaterThan(0);
  });
});
