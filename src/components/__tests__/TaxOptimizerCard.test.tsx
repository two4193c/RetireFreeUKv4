import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaxOptimizerCard } from '../TaxOptimizerCard';
import { UserProfile, InvestmentPots, TaxCalculationResult } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS, DEFAULT_PARTNER_POTS } from '../../utils/defaultData';

const createMockTaxResult = (overrides: Partial<TaxCalculationResult> = {}): TaxCalculationResult => ({
  grossIncome: 65000,
  effectiveGrossIncomeAfterSacrifice: 60000,
  personalAllowance: 12570,
  adjustedNetIncome: 60000,
  totalIncomeTax: 11432,
  totalNationalInsurance: 3450,
  netTakeHomePay: 45118,
  marginalTaxRate: 40,
  totalPensionContributionsAnnual: 8000,
  employeePensionContributionsAnnual: 5000,
  employerPensionContributionsAnnual: 3000,
  pensionBasicRateTaxRelief: 1000,
  pensionHigherRateTaxReliefClaimable: 1000,
  totalPensionTaxRelief: 2000,
  salarySacrificeNicSavedEmployee: 100,
  salarySacrificeNicSavedEmployer: 150,
  totalIsaContributionsAnnual: 6000,
  lisaGovernmentBonusAnnual: 0,
  is60PercentTaxTrap: false,
  taxTrapAmountInBracket: 0,
  recommendedTaxTrapPensionContribution: 0,
  eligibleEarnings: 65000,
  pensionAnnualAllowanceUsed: 8000,
  pensionAnnualAllowanceLimit: 60000,
  thresholdIncome: 60000,
  adjustedIncome: 63000,
  isTaperedAnnualAllowance: false,
  taperedReduction: 0,
  actualPensionAllowance: 60000,
  pensionAnnualAllowanceRemaining: 52000,
  actualPensionAllowanceRemaining: 52000,
  exceedsEligibleIncome: false,
  exceedsAnnualAllowanceOnly: false,
  isaAllowanceUsed: 6000,
  isaAllowanceLimit: 20000,
  isaAllowanceRemaining: 14000,
  lisaAllowanceUsed: 0,
  lisaAllowanceLimit: 4000,
  lisaAllowanceRemaining: 4000,
  maxTaxFreeCashCurrentBalance: 50000,
  projectedPensionAtAccessAge: 200000,
  maxTaxFreeCashAtAccessAge: 50000,
  lsaLimit: 268275,
  pensionAccessAge: 57,
  isNmpaRestricted: true,
  isRetirementBeforeAccessAge: false,
  isPclsRecyclingRisk: false,
  personalSavingsAllowance: 500,
  savingsInterestEarned: 200,
  taxableSavingsInterest: 0,
  savingsInterestTax: 0,
  savingsInterestTaxRate: 0.4,
  ...overrides,
});

describe('TaxOptimizerCard', () => {
  it('returns null when taxResult is not provided', () => {
    const { container } = render(
      <TaxOptimizerCard
        taxResult={null as unknown as TaxCalculationResult}
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders standard tax metrics and allowances for a single user', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'John Doe',
      isCouplePlanning: false,
      currentAge: 40,
      targetRetirementAge: 60,
    };

    const mockTaxResult = createMockTaxResult({
      totalPensionTaxRelief: 2500,
      personalAllowance: 12570,
      pensionAnnualAllowanceUsed: 12000,
      isaAllowanceUsed: 15000,
      personalSavingsAllowance: 500,
      savingsInterestEarned: 800,
      savingsInterestTax: 120,
    });

    render(
      <TaxOptimizerCard
        taxResult={mockTaxResult}
        profile={profile}
        pots={DEFAULT_POTS}
      />
    );

    // Verify tax relief card
    expect(screen.getAllByText('Tax Relief Gained').length).toBeGreaterThan(0);
    expect(screen.getByText('£2,500')).toBeInTheDocument();

    // Verify personal allowance card
    expect(screen.getAllByText('Personal Allowance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('£12,570').length).toBeGreaterThan(0);

    // Verify pension allowance card
    expect(screen.getAllByText('Pension Allowance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('£12,000').length).toBeGreaterThan(0);

    // Verify ISA allowance card
    expect(screen.getAllByText('ISA Allowance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('£15,000').length).toBeGreaterThan(0);

    // Verify Savings Interest Tax card
    expect(screen.getByText('Savings Interest Tax')).toBeInTheDocument();
    expect(screen.getByText('£120')).toBeInTheDocument();

    // Verify Year-by-Year breakdown section
    expect(screen.getByText('Year-by-Year Tax Relief & Allowances Breakdown')).toBeInTheDocument();
  });

  it('displays 60% tax trap alert and triggers onOptimizeTaxTrap callback when clicked', () => {
    const onOptimizeTaxTrap = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Sarah',
      grossAnnualSalary: 110000,
    };

    const mockTaxResult = createMockTaxResult({
      is60PercentTaxTrap: true,
      adjustedNetIncome: 110000,
      recommendedTaxTrapPensionContribution: 10000,
    });

    render(
      <TaxOptimizerCard
        taxResult={mockTaxResult}
        profile={profile}
        pots={DEFAULT_POTS}
        onOptimizeTaxTrap={onOptimizeTaxTrap}
      />
    );

    // Alert heading
    expect(screen.getByText(/60% UK Tax Trap Active \(Sarah\)/i)).toBeInTheDocument();
    expect(screen.getByText(/restores the full £12,570 Personal Allowance/i)).toBeInTheDocument();

    // Optimize button
    const applyButton = screen.getByRole('button', { name: /Apply Primary Strategy/i });
    expect(applyButton).toBeInTheDocument();

    fireEvent.click(applyButton);
    expect(onOptimizeTaxTrap).toHaveBeenCalledTimes(1);
    expect(onOptimizeTaxTrap).toHaveBeenCalledWith(10000, 'primary');
  });

  it('displays warnings for pension exceeding eligible income and carry forward notice', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Alex',
    };

    const mockTaxResult = createMockTaxResult({
      exceedsEligibleIncome: true,
      exceedsAnnualAllowanceOnly: true,
      isTaperedAnnualAllowance: true,
      pensionAnnualAllowanceLimit: 40000,
      thresholdIncome: 220000,
      adjustedIncome: 300000,
      taperedReduction: 20000,
    });

    render(
      <TaxOptimizerCard
        taxResult={mockTaxResult}
        profile={profile}
        pots={DEFAULT_POTS}
      />
    );

    expect(screen.getByText(/Pension Contributions Exceed Eligible Income \(Alex\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Annual Allowance Limit Exceeded/i)).toBeInTheDocument();
    expect(screen.getByText(/Pension Annual Allowance Tapered to £40,000/i)).toBeInTheDocument();
    expect(screen.getByText(/HMRC Taper Active/i)).toBeInTheDocument();
  });

  it('supports couple planning mode with interactive view switching between Household, Primary, and Partner', () => {
    const onOptimizeTaxTrap = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Alice',
      partnerName: 'Bob',
      isCouplePlanning: true,
      grossAnnualSalary: 60000,
      partnerGrossAnnualSalary: 115000,
      currentAge: 45,
      partnerCurrentAge: 44,
      targetRetirementAge: 60,
      partnerTargetRetirementAge: 60,
      partnerPots: {
        ...DEFAULT_PARTNER_POTS,
        workplacePensionMonthlyEmployee: 400,
        employerMatchPercentage: 5,
      },
    };

    const mockTaxResult = createMockTaxResult({
      totalPensionTaxRelief: 3000,
      personalAllowance: 12570,
      pensionAnnualAllowanceUsed: 10000,
      isaAllowanceUsed: 10000,
      personalSavingsAllowance: 500,
      savingsInterestEarned: 200,
      savingsInterestTax: 0,
    });

    render(
      <TaxOptimizerCard
        taxResult={mockTaxResult}
        profile={profile}
        pots={DEFAULT_POTS}
        onOptimizeTaxTrap={onOptimizeTaxTrap}
      />
    );

    // View Switcher should exist
    expect(screen.getByText('Tax & Allowance Perspective')).toBeInTheDocument();

    const householdBtns = screen.getAllByRole('button', { name: /Household/i });
    const aliceBtns = screen.getAllByRole('button', { name: /Alice/i });
    const bobBtns = screen.getAllByRole('button', { name: /Bob/i });

    expect(householdBtns.length).toBeGreaterThan(0);
    expect(aliceBtns.length).toBeGreaterThan(0);
    expect(bobBtns.length).toBeGreaterThan(0);

    // Click to Alice (Primary) view
    fireEvent.click(aliceBtns[0]);
    expect(screen.getByText('£12,570 Limit')).toBeInTheDocument();

    // Click to Bob (Partner) view
    fireEvent.click(bobBtns[0]);

    // Click back to Household view
    fireEvent.click(householdBtns[0]);
    expect(screen.getByText('£25,140 Dual Limit')).toBeInTheDocument();
  });

  it('handles year-by-year table expansion toggle when accumulation years exceed 7', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      currentAge: 35,
      targetRetirementAge: 65, // 30 accumulation years
    };

    const mockTaxResult = createMockTaxResult();

    render(
      <TaxOptimizerCard
        taxResult={mockTaxResult}
        profile={profile}
        pots={DEFAULT_POTS}
      />
    );

    // Expand button should exist
    const expandButton = screen.getByRole('button', { name: /Show All 30 Accumulation Years/i });
    expect(expandButton).toBeInTheDocument();

    // Click to expand
    fireEvent.click(expandButton);
    expect(screen.getByRole('button', { name: /Show First 7 Years/i })).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByRole('button', { name: /Show First 7 Years/i }));
    expect(screen.getByRole('button', { name: /Show All 30 Accumulation Years/i })).toBeInTheDocument();
  });
});
