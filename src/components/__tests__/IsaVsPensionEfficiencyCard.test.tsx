import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IsaVsPensionEfficiencyCard } from '../IsaVsPensionEfficiencyCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { calculateUKTax } from '../../utils/ukTaxEngine';
import { UserProfile, InvestmentPots } from '../../types';

describe('IsaVsPensionEfficiencyCard', () => {
  it('renders correctly with headline insight and core KPI metrics', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 45,
      targetRetirementAge: 60,
      grossAnnualSalary: 60000,
      pensionContributionMethod: 'salary_sacrifice',
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 50000,
      stocksAndSharesIsaMonthlyContribution: 400,
      workplacePensionBalance: 150000,
    };
    const taxResult = calculateUKTax(profile, pots);

    render(
      <IsaVsPensionEfficiencyCard
        profile={profile}
        pots={pots}
        taxResult={taxResult}
      />
    );

    expect(screen.getByRole('heading', { name: /Tax-Efficient Savings Crossover \(ISA vs Pension\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Strategy Optimizer/i)).toBeInTheDocument();
    expect(screen.getByText(/Projection Insight & Crossover Age Strategy/i)).toBeInTheDocument();
    expect(screen.getByText(/Upfront Tax Relief Boost/i)).toBeInTheDocument();
    expect(screen.getByText(/Pension Net Advantage/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Monthly Savings Split/i)).toBeInTheDocument();
  });

  it('renders early retirement ISA bridge with gap and deficit details', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 45,
      targetRetirementAge: 52, // 5 years before NMPA 57
      targetRetirementIncomeAnnual: 30000,
      grossAnnualSalary: 75000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 10000, // Small ISA balance creates bridge shortfall
      stocksAndSharesIsaMonthlyContribution: 100,
    };
    const taxResult = calculateUKTax(profile, pots);

    render(
      <IsaVsPensionEfficiencyCard
        profile={profile}
        pots={pots}
        taxResult={taxResult}
      />
    );

    expect(screen.getByText(/5 Yrs Gap/i)).toBeInTheDocument();
    expect(screen.getByText(/Bridge Income Needed/i)).toBeInTheDocument();
    expect(screen.getByText(/Bridge Shortfall:/i)).toBeInTheDocument();
  });

  it('toggles age-by-age tax efficiency matrix table display', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 48,
      targetRetirementAge: 60,
    };
    const taxResult = calculateUKTax(profile, DEFAULT_POTS);

    render(
      <IsaVsPensionEfficiencyCard
        profile={profile}
        pots={DEFAULT_POTS}
        taxResult={taxResult}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /Age-by-Age Tax Efficiency Timeline/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.getByText('Show Age Breakdown')).toBeInTheDocument();

    // Table should not be rendered yet
    expect(screen.queryByText('Upfront Relief')).not.toBeInTheDocument();

    // Click to show table
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Hide Age Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Upfront Relief')).toBeInTheDocument();
    expect(screen.getByText('Effective Drawdown Tax')).toBeInTheDocument();
    expect(screen.getByText('Pension Net Return')).toBeInTheDocument();
    expect(screen.getByText('Recommended Focus')).toBeInTheDocument();

    // Click to hide table again
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Show Age Breakdown')).toBeInTheDocument();
    expect(screen.queryByText('Upfront Relief')).not.toBeInTheDocument();
  });

  it('renders fully covered bridge badge when ISA savings comfortably exceed required bridge income', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 48,
      targetRetirementAge: 55, // 2 year gap to 57
      targetRetirementIncomeAnnual: 20000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 250000, // Large ISA easily covers 2 years (£40,000)
    };
    const taxResult = calculateUKTax(profile, pots);

    render(
      <IsaVsPensionEfficiencyCard
        profile={profile}
        pots={pots}
        taxResult={taxResult}
      />
    );

    expect(screen.getByText(/✓ Fully Funded/i)).toBeInTheDocument();
  });
});
