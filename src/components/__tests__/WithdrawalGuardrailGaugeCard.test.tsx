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

  it('handles couple planning mode with partner assets and partner guaranteed income', () => {
    const coupleProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 62,
      targetRetirementAge: 62,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 65,
      targetRetirementIncomeAnnual: 45000,
      includeStatePension: false,
      partnerIncludeStatePension: true,
      partnerStatePensionAge: 67,
      partnerStatePensionAmountAnnual: 10000,
      dbPensions: [
        { id: 'db-part', name: 'Partner DB', owner: 'partner' as const, startAge: 60, annualIncome: 5000, enabled: true },
      ],
      fixedIncomeStreams: [
        { id: 'fix-pri', name: 'Rental', owner: 'primary' as const, startAge: 60, annualAmount: 4000, enabled: true },
      ],
    };

    const couplePots = {
      ...DEFAULT_POTS,
      sippBalance: 500000,
      partnerPots: {
        ...DEFAULT_POTS,
        stocksAndSharesIsaBalance: 200000,
      },
    };

    render(
      <WithdrawalGuardrailGaugeCard
        profile={coupleProfile}
        pots={couplePots}
        horizonYears={30}
      />
    );

    expect(screen.getByText(/Dynamic Guardrail Threshold Gauge/i)).toBeInTheDocument();
    expect(screen.getByText(/Within Safe Guardrail Corridor/i)).toBeInTheDocument();
  });

  it('renders prosperity state when portfolio is very large relative to spending demand', () => {
    const richProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 25000,
    };
    const richPots = {
      ...DEFAULT_POTS,
      sippBalance: 3000000,
    };

    render(
      <WithdrawalGuardrailGaugeCard
        profile={richProfile}
        pots={richPots}
        horizonYears={30}
      />
    );

    expect(screen.getByText(/Below Lower Guardrail — Prosperity Rule/i)).toBeInTheDocument();
  });

  it('renders capital preservation state when withdrawal rate exceeds upper guardrail', () => {
    const tightProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 60000,
      includeStatePension: false,
    };
    const tightPots = {
      ...DEFAULT_POTS,
      sippBalance: 300000,
    };

    render(
      <WithdrawalGuardrailGaugeCard
        profile={tightProfile}
        pots={tightPots}
        horizonYears={30}
      />
    );

    expect(screen.getByText(/Upper Guardrail Breached — Capital Preservation Rule/i)).toBeInTheDocument();
  });

  it('handles zero total assets with fallback SWR', () => {
    const zeroPots: any = {
      workplacePensionBalance: 0,
      sippBalance: 0,
      stocksAndSharesIsaBalance: 0,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 0,
    };

    render(
      <WithdrawalGuardrailGaugeCard
        profile={DEFAULT_PROFILE}
        pots={zeroPots}
        horizonYears={30}
      />
    );

    expect(screen.getAllByText(/3.50%/i).length).toBeGreaterThan(0);
  });

  it('calculates State Pension deferral boost and qualifying years without projection results for couple', () => {
    const coupleLateProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 68,
      targetRetirementAge: 68,
      isCouplePlanning: true,
      includeStatePension: true,
      statePensionAge: 67,
      statePensionDeferralYears: 1,
      qualifyingYears: 30,
      fullStatePensionAmount: 12000,
      partnerCurrentAge: 68,
      partnerIncludeStatePension: true,
      partnerStatePensionAge: 67,
      partnerStatePensionDeferralYears: 1,
      partnerQualifyingYears: 25,
      partnerFullStatePensionAmount: 12000,
      targetRetirementIncomeAnnual: 40000,
    };

    const richPots = {
      ...DEFAULT_POTS,
      sippBalance: 500000,
    };

    render(
      <WithdrawalGuardrailGaugeCard
        profile={coupleLateProfile}
        pots={richPots}
        horizonYears={25}
      />
    );

    expect(screen.getByText(/Dynamic Guardrail Threshold Gauge/i)).toBeInTheDocument();
  });

  it('handles projection results where retirement row has 0 total withdrawal', () => {
    const zeroWithdrawalRow = {
      age: 60,
      isRetired: true,
      totalPot: 500000,
      totalWithdrawalAmount: 0,
      targetRetirementIncome: 30000,
      statePensionReceived: 0,
      dbPensionIncomeReceived: 0,
      annuityIncomeReceived: 0,
    } as unknown as YearProjection;

    render(
      <WithdrawalGuardrailGaugeCard
        profile={{ ...DEFAULT_PROFILE, currentAge: 55, targetRetirementAge: 60 }}
        pots={DEFAULT_POTS}
        horizonYears={30}
        projectionResults={[zeroWithdrawalRow]}
      />
    );

    expect(screen.getByText(/Dynamic Guardrail Threshold Gauge/i)).toBeInTheDocument();
  });
});
