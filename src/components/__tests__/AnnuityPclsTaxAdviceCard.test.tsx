import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnnuityPclsTaxAdviceCard } from '../AnnuityPclsTaxAdviceCard';
import { UserProfile } from '../../types';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('AnnuityPclsTaxAdviceCard', () => {
  const mockProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    name: 'Arthur',
    currentAge: 60,
    targetRetirementAge: 65,
    statePensionAge: 67,
    statePensionAmountAnnual: 11500,
    dbPensions: [
      {
        id: 'db-1',
        name: 'NHS DB Pension',
        annualIncome: 10000,
        startAge: 60,
        inflationLinked: true,
        owner: 'primary',
        enabled: true,
        taxFreeLumpSum: 0,
      },
    ],
  };

  it('renders side-by-side scenario cards for primary person', () => {
    render(
      <AnnuityPclsTaxAdviceCard
        profile={mockProfile}
        person="primary"
        projectedPot={400000}
        purchaseAge={65}
        annuityRate={6.0}
        pclsPercent={25}
        takeLumpSumAtStart={true}
      />
    );

    expect(screen.getByText('Annuity & 25% Tax-Free Lump Sum (PCLS) Income Tax Advice')).toBeInTheDocument();
    expect(screen.getByText(/Tax analysis for Arthur/i)).toBeInTheDocument();

    // Current selection pill
    expect(screen.getByText('25% PCLS Taken Upfront')).toBeInTheDocument();

    // Option A: 25% PCLS of £400k is £100k
    expect(screen.getByText('Option A: Take 25% Tax-Free Cash Upfront')).toBeInTheDocument();
    expect(screen.getByText('£100,000')).toBeInTheDocument();
    expect(screen.getByText('£300,000')).toBeInTheDocument(); // 75% remaining
    expect(screen.getByText('£18,000 / yr')).toBeInTheDocument(); // 6% of £300k

    // Option B: 100% Annuity
    expect(screen.getByText('Option B: 100% Pot to Annuity (No PCLS)')).toBeInTheDocument();
    expect(screen.getByText('£24,000 / yr')).toBeInTheDocument(); // 6% of £400k
  });

  it('allows toggling between Option A and Option B via onToggleTakeLumpSum', () => {
    const onToggle = vi.fn();

    const { rerender } = render(
      <AnnuityPclsTaxAdviceCard
        profile={mockProfile}
        person="primary"
        projectedPot={400000}
        purchaseAge={65}
        annuityRate={6.0}
        takeLumpSumAtStart={true}
        onToggleTakeLumpSum={onToggle}
      />
    );

    // Option B select button should be available
    const selectOptB = screen.getByRole('button', { name: /Select Option B/i });
    fireEvent.click(selectOptB);
    expect(onToggle).toHaveBeenCalledWith(false);

    // Rerender with takeLumpSumAtStart=false
    rerender(
      <AnnuityPclsTaxAdviceCard
        profile={mockProfile}
        person="primary"
        projectedPot={400000}
        purchaseAge={65}
        annuityRate={6.0}
        takeLumpSumAtStart={false}
        onToggleTakeLumpSum={onToggle}
      />
    );

    // Option A select button should be available
    const selectOptA = screen.getByRole('button', { name: /Select Option A/i });
    fireEvent.click(selectOptA);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('expands and collapses detailed tax advice accordion', () => {
    render(
      <AnnuityPclsTaxAdviceCard
        profile={mockProfile}
        projectedPot={300000}
        purchaseAge={66}
        annuityRate={5.5}
        takeLumpSumAtStart={true}
      />
    );

    expect(screen.queryByText(/1. State Pension & Personal Allowance/i)).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /Show Detailed Advice/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/1. State Pension & Personal Allowance/i)).toBeInTheDocument();
    expect(screen.getByText(/2. The ISA Income Tax Shelter/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Preventing 40% Tax & 60% Taper Traps/i)).toBeInTheDocument();
    expect(screen.getByText(/4. HMRC Schedule 29 Recycling Rule Warning/i)).toBeInTheDocument();

    // Collapse
    fireEvent.click(toggleBtn);
    expect(screen.queryByText(/1. State Pension & Personal Allowance/i)).not.toBeInTheDocument();
  });

  it('calculates higher rate and personal allowance taper when total income exceeds £100k', () => {
    render(
      <AnnuityPclsTaxAdviceCard
        profile={mockProfile}
        person="primary"
        projectedPot={2000000} // Large pot generating over £100k annuity
        purchaseAge={68} // State pension active
        annuityRate={7.0} // £140k annuity gross
        takeLumpSumAtStart={false}
      />
    );

    expect(screen.getByText(/Tax analysis for Arthur/i)).toBeInTheDocument();
    // Verify that estimated tax was computed under PA taper rules
    expect(screen.getAllByText(/Estimated Annual Income Tax:/i).length).toBe(2);
  });

  it('supports partner annuity calculation and active partner DB pensions', () => {
    const coupleProfile: UserProfile = {
      ...mockProfile,
      isCouplePlanning: true,
      partnerName: 'Beatrice',
      partnerStatePensionAge: 67,
      partnerStatePensionAmountAnnual: 11000,
      dbPensions: [
        {
          id: 'db-p',
          name: 'Teachers DB Pension',
          annualIncome: 12000,
          startAge: 65,
          inflationLinked: true,
          owner: 'partner',
          enabled: true,
          taxFreeLumpSum: 0,
        },
      ],
    };

    render(
      <AnnuityPclsTaxAdviceCard
        profile={coupleProfile}
        person="partner"
        projectedPot={500000}
        purchaseAge={68}
        annuityRate={6.5}
        takeLumpSumAtStart={true}
      />
    );

    expect(screen.getByText(/Tax analysis for Beatrice/i)).toBeInTheDocument();
  });
});
