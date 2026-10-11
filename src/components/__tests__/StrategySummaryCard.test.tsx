import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StrategySummaryCard } from '../StrategySummaryCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { calculateUKTax } from '../../utils/ukTaxEngine';
import { UserProfile, InvestmentPots } from '../../types';

describe('StrategySummaryCard', () => {
  it('renders DC Pension PCLS and Defined Benefit scheme lump sum details clearly', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      dateOfBirth: '1975-05-10', // NMPA 57
      currentAge: 50,
      targetRetirementAge: 60,
      dbPensions: [
        {
          id: 'db1',
          name: 'NHS Final Salary',
          owner: 'primary',
          startAge: 65,
          annualIncome: 12000,
          taxFreeLumpSum: 36000,
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
        },
      ],
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 200000,
      stocksAndSharesIsaBalance: 50000,
    };
    const taxResult = calculateUKTax(profile, pots);

    render(
      <StrategySummaryCard
        profile={profile}
        pots={pots}
        taxResult={taxResult}
      />
    );

    // Verify DC Pension PCLS label is explicit
    expect(screen.getByText(/DC Pension PCLS \(SIPP \/ Workplace\):/i)).toBeInTheDocument();
    expect(screen.getByText(/DC Pension Access Age \(NMPA\):/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Age 57/i).length).toBeGreaterThan(0);

    // Verify Defined Benefit section is clearly rendered with its own start age 65
    expect(screen.getByText(/Defined Benefit \(DB\) Schemes & Lump Sums/i)).toBeInTheDocument();
    expect(screen.getByText(/NHS Final Salary/i)).toBeInTheDocument();
    expect(screen.getByText(/Starts Age 65/i)).toBeInTheDocument();
    expect(screen.getByText(/£36,000 at Age 65/i)).toBeInTheDocument();
    expect(screen.getByText(/Paid at Scheme Start Age \(Independent of DC Age 57\)/i)).toBeInTheDocument();
  });

  it('renders partner drawdown strategy and partner state pension in couple planning mode', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Oliver',
      partnerName: 'Sophie',
      currentAge: 55,
      targetRetirementAge: 60,
      partnerCurrentAge: 53,
      partnerTargetRetirementAge: 58,
      drawdownStrategy: 'pension_first',
      partnerDrawdownStrategy: 'isa_first',
      incomeProductOption: 'flexi_drawdown',
      partnerIncomeProductOption: 'annuity',
      partnerQualifyingYears: 30,
      partnerStatePensionDeferralYears: 2,
    };
    const taxResult = calculateUKTax(profile, DEFAULT_POTS);

    render(
      <StrategySummaryCard
        profile={profile}
        pots={DEFAULT_POTS}
        taxResult={taxResult}
      />
    );

    expect(screen.getByText(/Sophie Drawdown Strategy/i)).toBeInTheDocument();
    expect(screen.getByText(/Retire @ Age 58/i)).toBeInTheDocument();
    expect(screen.getByText(/Full Annuity Purchase/i)).toBeInTheDocument();
    expect(screen.getByText(/Sophie SP Age:/i)).toBeInTheDocument();
    expect(screen.getByText(/Deferred \+2y/i)).toBeInTheDocument();
  });

  it('displays hybrid product option with annuity tranches and phased crystallisation mode', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      incomeProductOption: 'hybrid',
      annuityTranches: [
        {
          id: 'tranche-1',
          name: 'Guaranteed Base Tranche',
          purchaseAge: 65,
          allocationPercent: 30,
          annuityRatePercent: 6.2,
          annuityType: 'level_single',
          durationOption: 'lifetime',
          enabled: true,
          owner: 'primary',
        },
      ],
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [
        {
          id: 'c-tranche-1',
          name: 'Annual Tax-Free Tranche',
          age: 60,
          amount: 20000,
          pclsPercent: 25,
          frequency: 'recurring',
          endAge: 65,
          enabled: true,
          owner: 'primary',
        },
      ],
    };
    const taxResult = calculateUKTax(profile, DEFAULT_POTS);

    render(
      <StrategySummaryCard
        profile={profile}
        pots={DEFAULT_POTS}
        taxResult={taxResult}
      />
    );

    expect(screen.getByText(/Hybrid \(Drawdown \+ Annuity\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Guaranteed Base Tranche \(Age 65\):/i)).toBeInTheDocument();
    expect(screen.getByText(/30% @ 6.2% rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Phased Tranches PCLS:/i)).toBeInTheDocument();
  });

  it('handles State Pension qualifying years under 10 and excluded state pension', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      includeStatePension: true,
      qualifyingYears: 7, // < 10 years
      enableTripleLock: false,
    };
    const taxResult = calculateUKTax(profile, DEFAULT_POTS);

    render(
      <StrategySummaryCard
        profile={profile}
        pots={DEFAULT_POTS}
        taxResult={taxResult}
      />
    );

    expect(screen.getByText(/Min 10 Yrs Required/i)).toBeInTheDocument();
    expect(screen.getByText(/Disabled \(Flat Nominal £\)/i)).toBeInTheDocument();
  });

  it('displays active UK Gilt Ladder banner when enabled in profile', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      giltLadderConfig: {
        enabled: true,
        durationYears: 5,
        startAge: 60,
        targetAnnualIncome: 18000,
        fundingSource: 'gia',
        customYieldPercent: 4.2,
      },
    };
    const taxResult = calculateUKTax(profile, DEFAULT_POTS);

    render(
      <StrategySummaryCard
        profile={profile}
        pots={DEFAULT_POTS}
        taxResult={taxResult}
      />
    );

    expect(screen.getByText(/Active UK Gilt Ladder \(5 Years from Age 60\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivers £18,000\/yr guaranteed cashflow via 0% CGT arbitrage/i)).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });
});
