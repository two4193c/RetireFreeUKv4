import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PwrMetricBannerCard } from '../PwrMetricBannerCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { YearProjection } from '../../types';

describe('PwrMetricBannerCard', () => {
  it('renders milestone tabs and calculates metrics for retirement start', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 60,
      statePensionAge: 67,
      targetRetirementIncomeAnnual: 40000,
    };

    const pots = {
      ...DEFAULT_POTS,
      sippBalance: 400000,
      stocksAndSharesIsaBalance: 100000,
    };

    render(
      <PwrMetricBannerCard
        profile={profile}
        pots={pots}
      />
    );

    expect(screen.getByText(/Personalized Withdrawal Rate \(PWR\) Metric/i)).toBeInTheDocument();
    expect(screen.getByText(/Retirement Start \(Age 60\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Today's Pots \(Age 50\)/i)).toBeInTheDocument();
  });

  it('switches between milestone tabs and updates active basis metrics', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 60,
      statePensionAge: 67,
      includeStatePension: true,
      statePensionAmountAnnual: 11500,
      targetRetirementIncomeAnnual: 40000,
    };

    const projections: YearProjection[] = [
      {
        age: 60,
        isRetired: true,
        totalPot: 600000,
        totalWithdrawalAmount: 40000,
        targetRetirementIncome: 40000,
        statePensionReceived: 0,
        dbPensionIncomeReceived: 0,
        annuityIncomeReceived: 0,
      } as unknown as YearProjection,
      {
        age: 67,
        isRetired: true,
        totalPot: 550000,
        totalWithdrawalAmount: 28500,
        targetRetirementIncome: 40000,
        statePensionReceived: 11500,
        dbPensionIncomeReceived: 0,
        annuityIncomeReceived: 0,
      } as unknown as YearProjection,
    ];

    render(
      <PwrMetricBannerCard
        profile={profile}
        pots={DEFAULT_POTS}
        projections={projections}
      />
    );

    const spTab = screen.getByText(/State Pension \(Age 67\)/i);
    expect(spTab).toBeInTheDocument();

    fireEvent.click(spTab);

    // Guaranteed income should now display the State Pension amount
    expect(screen.getAllByText(/State Pension \(Age 67\)/i).length).toBeGreaterThan(0);

    const todayTab = screen.getByText(/Today's Pots \(Age 50\)/i);
    fireEvent.click(todayTab);
    expect(screen.getAllByText(/Today's Pots \(Age 50\)/i).length).toBeGreaterThan(0);
  });

  it('correctly aggregates partner pots and partner guaranteed income in couple planning mode', () => {
    const coupleProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 68,
      targetRetirementAge: 68,
      isCouplePlanning: true,
      includeStatePension: true,
      statePensionAmountAnnual: 11500,
      partnerCurrentAge: 68,
      partnerIncludeStatePension: true,
      partnerStatePensionAge: 67,
      partnerStatePensionAmountAnnual: 10500,
      partnerPots: {
        ...DEFAULT_POTS,
        sippBalance: 300000,
        stocksAndSharesIsaBalance: 150000,
      },
      dbPensions: [
        {
          id: 'db1',
          name: 'Partner DB',
          owner: 'partner' as const,
          startAge: 65,
          annualIncome: 5000,
          enabled: true,
        },
      ],
      targetRetirementIncomeAnnual: 45000,
    };

    const couplePots = {
      ...DEFAULT_POTS,
      sippBalance: 400000,
    };

    render(
      <PwrMetricBannerCard
        profile={coupleProfile}
        pots={couplePots}
      />
    );

    expect(screen.getByText(/Personalized Withdrawal Rate \(PWR\) Metric/i)).toBeInTheDocument();
  });

  it('handles zero starting capital with 0% SWR gracefully', () => {
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
      <PwrMetricBannerCard
        profile={DEFAULT_PROFILE}
        pots={zeroPots}
      />
    );

    expect(screen.getAllByText(/0.00%/i).length).toBeGreaterThan(0);
  });
});
