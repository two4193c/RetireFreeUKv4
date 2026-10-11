import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MonthlySavingsRateCard } from '../MonthlySavingsRateCard';
import { DEFAULT_PROFILE, DEFAULT_POTS, DEFAULT_PARTNER_POTS } from '../../utils/defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('MonthlySavingsRateCard', () => {
  it('renders single user savings rate metrics and guidelines correctly', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Alice',
      isCouplePlanning: false,
      grossAnnualSalary: 60000,
      currentAge: 30,
      targetRetirementAge: 65,
    };

    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionMonthlyEmployee: 5,
      employerMatchPercentage: 3,
      sippBalance: 50000,
      sippMonthlyContribution: 200,
      stocksAndSharesIsaBalance: 30000,
      stocksAndSharesIsaMonthlyContribution: 300,
    };

    render(<MonthlySavingsRateCard profile={profile} pots={pots} />);

    // Header & subtitle
    expect(screen.getByRole('heading', { name: /^Savings Rate$/i })).toBeInTheDocument();
    expect(screen.getByText(/Overview of monthly savings rates and year-by-year accumulation/i)).toBeInTheDocument();

    // High level metrics
    expect(screen.getByText('Combined Monthly Inputs')).toBeInTheDocument();
    expect(screen.getByText('Overall Savings Rate')).toBeInTheDocument();
    expect(screen.getByText('Personal Outlay')).toBeInTheDocument();
    expect(screen.getByText('Employer Top-Up')).toBeInTheDocument();

    // Rule of thumb info
    expect(screen.getByText(/UK Retirement Savings Rule of Thumb:/i)).toBeInTheDocument();
    expect(screen.getByText(/half the age you started saving/i)).toBeInTheDocument();

    // Accumulation table
    expect(screen.getByText(/Year-by-Year Savings Rate Breakdown \(Until Retirement\)/i)).toBeInTheDocument();
  });

  it('supports toggling between first 7 years and all accumulation years', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 30,
      targetRetirementAge: 50, // 20 years difference
      grossAnnualSalary: 50000,
    };

    render(<MonthlySavingsRateCard profile={profile} pots={DEFAULT_POTS} />);

    // Check button exists
    const toggleBtn = screen.getByRole('button', { name: /Show All \d+ Accumulation Years/i });
    expect(toggleBtn).toBeInTheDocument();

    // Click to show all years
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /Show First 7 Years/i })).toBeInTheDocument();

    // Click to show first 7 years again
    fireEvent.click(screen.getByRole('button', { name: /Show First 7 Years/i }));
    expect(screen.getByRole('button', { name: /Show All \d+ Accumulation Years/i })).toBeInTheDocument();
  });

  it('renders couple tabs and switches between Household, Primary, and Partner views', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Bob',
      partnerName: 'Charlie',
      isCouplePlanning: true,
      grossAnnualSalary: 60000,
      partnerGrossAnnualSalary: 40000,
      currentAge: 40,
      partnerCurrentAge: 38,
      targetRetirementAge: 65,
      partnerTargetRetirementAge: 65,
      partnerPots: {
        ...DEFAULT_PARTNER_POTS,
        stocksAndSharesIsaBalance: 20000,
        stocksAndSharesIsaMonthlyContribution: 250,
      },
    };

    render(<MonthlySavingsRateCard profile={profile} pots={DEFAULT_POTS} />);

    // Tabs should be visible
    const householdBtn = screen.getByRole('button', { name: /Household/i });
    const primaryBtn = screen.getByRole('button', { name: /Bob/i });
    const partnerBtn = screen.getByRole('button', { name: /Charlie/i });

    expect(householdBtn).toBeInTheDocument();
    expect(primaryBtn).toBeInTheDocument();
    expect(partnerBtn).toBeInTheDocument();

    // Switch to Primary
    fireEvent.click(primaryBtn);
    expect(screen.getByText('Total Monthly Savings')).toBeInTheDocument();

    // Switch to Partner
    fireEvent.click(partnerBtn);
    expect(screen.getByText('Total Monthly Savings')).toBeInTheDocument();

    // Switch back to Household
    fireEvent.click(householdBtn);
    expect(screen.getByText('Combined Monthly Inputs')).toBeInTheDocument();
  });

  it('incorporates one-off contributions for the current tax year', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 50000,
      isCouplePlanning: false,
      oneOffContributions: [
        {
          id: 'one-off-1',
          name: 'Annual Workplace Bonus Sacrifice',
          targetPot: 'workplace_pension',
          grossAmount: 6000,
          date: '2026-05-01',
          enabled: true,
          owner: 'primary',
          frequency: 'one_off',
        },
        {
          id: 'one-off-2',
          name: 'Annual SIPP Top-Up',
          targetPot: 'sipp',
          grossAmount: 3000,
          date: '2026-06-01',
          enabled: true,
          owner: 'primary',
          frequency: 'one_off',
        },
        {
          id: 'one-off-3',
          name: 'ISA Lump Sum',
          targetPot: 'stocks_and_shares_isa',
          grossAmount: 1200,
          date: '2026-07-01',
          enabled: true,
          owner: 'primary',
          frequency: 'one_off',
        },
        {
          id: 'one-off-4',
          name: 'GIA Lump Sum',
          targetPot: 'gia',
          grossAmount: 1200,
          date: '2026-08-01',
          enabled: true,
          owner: 'primary',
          frequency: 'one_off',
        },
      ],
    };

    render(<MonthlySavingsRateCard profile={profile} pots={DEFAULT_POTS} />);

    expect(screen.getByRole('heading', { name: /^Savings Rate$/i })).toBeInTheDocument();
    // One off contributions should be factored into monthly savings calculation
    expect(screen.getByText(/Personal Outlay/i)).toBeInTheDocument();
  });

  it('displays status badge based on savings rate benchmarks', () => {
    // Low savings rate profile (<10%)
    const lowProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 100000,
      currentAge: 40,
    };

    const emptyPots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionMonthlyEmployee: 0,
      employerMatchPercentage: 0,
      sippMonthlyContribution: 0,
      stocksAndSharesIsaMonthlyContribution: 0,
      lisaMonthlyContribution: 0,
      cashIsaMonthlyContribution: 0,
      giaMonthlyContribution: 0,
      cashSavingsMonthlyContribution: 0,
    };

    const { rerender } = render(<MonthlySavingsRateCard profile={lowProfile} pots={emptyPots} />);
    expect(screen.getByText('Below Benchmark')).toBeInTheDocument();

    // High savings rate profile (>25%)
    const highProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 50000,
      currentAge: 30,
    };
    const highPots: InvestmentPots = {
      ...emptyPots,
      workplacePensionMonthlyEmployeeType: 'percent',
      workplacePensionMonthlyEmployee: 15,
      employerMatchPercentage: 10,
    };
    rerender(<MonthlySavingsRateCard profile={highProfile} pots={highPots} />);
    expect(screen.getByText('Excellent Rate')).toBeInTheDocument();
  });
});
